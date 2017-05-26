import 'zone.js';
import {Dispatch, MiddlewareAPI} from 'redux';
import {ActionInTransaction, START_TRANSACTION_ACTION_TYPE} from './actions';
import {TRANSACTION_ID_ZONE_KEY} from './transaction';
import {StateWithTransactions} from './reducer';

/**
 * Action transactions enhance middleware.
 * This middleware is responsible for mark action with transaction id, and reject actions which are targeting not existing.
 */
export function transactionMiddleware<S>(api: MiddlewareAPI<S>): (next: Dispatch<S>) => Dispatch<S> {
    let outsideZone = Zone.current;
    return (next: Dispatch<S>): Dispatch<S> => {
        return <A extends ActionInTransaction>(action: A): A => {
            if (!action.meta || !action.meta.transactionId) {
                // this will not affect the dev tool beacause saved actions contains meta
                let transactionId: number = Zone.current.get(TRANSACTION_ID_ZONE_KEY);
                if (transactionId) {
                    action.meta =  Object.assign({}, action.meta, {transactionId});
                }
            }
            // we will throw error to stop asap processing the transaction, this error is catch by transaction and ignored
            if (action.meta && action.meta.transactionId && action.type !== START_TRANSACTION_ACTION_TYPE) {
                let state: StateWithTransactions = <any> api.getState();
                if (!state.$$transactions || !state.$$transactions[action.meta.transactionId]) {
                    throw 'IgnoreActionOnNotExistingTransaction';
                }
            }
            if (typeof action === 'function') {
                return <A> next(action);
            } else {
                return outsideZone.run<A>(() => next(action));
            }
        };
    };
}
