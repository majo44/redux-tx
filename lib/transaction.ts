import 'zone.js';
import {Dispatch} from 'redux';
import {
    cancelTransactionAction, commitTransactionAction, rejectTransactionAction, startTransactionAction,
    timeoutTransactionAction
} from './actions';

export const TRANSACTION_ID_ZONE_KEY: string = 'transactionId';

const UNNAMED_TRANSACTION_NAME: string = 'unnamed';
const DEFAULT_TRANSACTION_TIMEOUT = 60 * 1000;

let transactionTimeout = DEFAULT_TRANSACTION_TIMEOUT;
let transactionIdCounter = 1;


export type TransactionPhase = 'CANCELLED' | 'REJECTED' | 'COMMITED' | 'TIMEOUTED' | 'PENDING';

/**
 * Promise with possibility to cancel with 2 flags.
 */
export interface TransactionPromise extends Promise<void> {
    state: TransactionPhase;
    cancel(): void;
}

/**
 * Run code in transaction.
 * @param dispatch redux dispatch function
 * @param tx the transaction code
 * @param timeout optional timeout for transaction, if not provided, the global one will be used, the default is 1 min
 */
export function transaction(dispatch: Dispatch<any>, tx: () => void | Promise<void>, timeout?: number): TransactionPromise;

/**
 * Run code in transaction.
 * @param name name of transaction
 * @param dispatch redux dispatch function
 * @param tx the transaction code
 * @param timeout optional timeout for transaction, if not provided, the global one will be used, the default is 1 min
 */
export function transaction(name: string, dispatch: Dispatch<any>, tx: () => void | Promise<void>, timeout?: number): TransactionPromise;
export function transaction(): TransactionPromise {

    // parsing attrs;
    let dispatch: Dispatch<any>;
    let fn: () => Promise<void>;
    let name: string;
    let timeoutTime: any;

    let shift = 0;
    if (typeof arguments[0] === 'string') {
        name = arguments[0];
        shift = 1;
    } else {
        name = UNNAMED_TRANSACTION_NAME;
    }

    dispatch = arguments[shift];
    fn = arguments[1 + shift];
    timeoutTime = typeof arguments[2 + shift] === 'undefined' ? transactionTimeout : arguments[2 + shift] ;

    let transactionId: number = transactionIdCounter++;
    let parentTransactionId: number = Zone.current.get(TRANSACTION_ID_ZONE_KEY);
    let timeout: any;
    let proxyResolve: () => void;
    let proxyReject: (ex: any) => void;
    let proxyPromise = new Promise<boolean>((resolve, reject) => {
        proxyResolve = resolve;
        proxyReject = reject;
    });
    let phase: TransactionPhase;
    let outsideZone = Zone.current;

    function onStart() {
        phase = 'PENDING';
        dispatch(startTransactionAction(name, transactionId, parentTransactionId));
    }

    function onCancel() {
        if (phase === 'PENDING') {
            phase = 'CANCELLED';
            if (timeout) {
                clearTimeout(timeout);
            }
            dispatch(cancelTransactionAction());
            outsideZone.run(proxyResolve);
        }
    }

    function onCommit() {
        if (phase === 'PENDING') {
            phase = 'COMMITED';
            if (timeout) {
                clearTimeout(timeout);
            }
            dispatch(commitTransactionAction());
            outsideZone.run(proxyResolve);
        }
    }

    function onError(error: any) {
        if (phase === 'PENDING') {
            if (timeout) {
                clearTimeout(timeout);
            }
            phase = 'REJECTED';
            dispatch(rejectTransactionAction(error));
            outsideZone.run(() => proxyReject(error));
        }
    }

    function onTimeout() {
        phase = 'TIMEOUTED';
        dispatch(timeoutTransactionAction());
        outsideZone.run(() => proxyReject(`Transaction ${name} (id: ${transactionId}) timeout!`));
    }

    let transactionZone = Zone.current.fork({
        name: 'transaction',
        properties: {
            [TRANSACTION_ID_ZONE_KEY]: transactionId
        }
    });

    transactionZone.run<Promise<void>>(() => {
        onStart();
        if (timeoutTime > 0) {
            timeout = setTimeout(onTimeout, timeoutTime);
        }
        try {
            let x: any = fn();
            if (x && x.then) {
                return x.then(() => {
                    onCommit();
                }, (ex: any) => {
                    onError(ex);
                });
            } else {
                onCommit();
            }
        } catch (ex) {
            onError(ex);
        }
    });

    let transactionPromise: TransactionPromise = <TransactionPromise> <any> proxyPromise;

    // adding cancel function
    transactionPromise.cancel = function() {
        transactionZone.run(onCancel);
    };

    // define getter for checking the transaction state
    Object.defineProperty(transactionPromise, 'state', {
        get: () => {
            return phase;
        }
    });


    return transactionPromise;
}

/**
 * Sets default timeout for all transactions.
 * @param timeout
 */
export function setTransactionTimeout(timeout: number) {
    transactionTimeout = timeout;
}
