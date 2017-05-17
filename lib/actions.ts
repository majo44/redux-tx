
import {Action} from 'redux';

export interface ActionInTransaction extends Action {
    meta?: {
        transactionId?: number
    };
}

export const START_TRANSACTION_ACTION_TYPE = 'StartTransactionAction';
export interface StartTransactionAction extends ActionInTransaction {
    type: typeof START_TRANSACTION_ACTION_TYPE;
    payload: {
        transactionName: string;
    }
}
export function startTransactionAction(name: string): StartTransactionAction {
    return {type: START_TRANSACTION_ACTION_TYPE, payload: {transactionName: name}};
}


export const COMMIT_TRANSACTION_ACTION_TYPE = 'CommitTransactionAction';
export interface CommitTransactionAction extends ActionInTransaction {
    type: typeof COMMIT_TRANSACTION_ACTION_TYPE;
}
export function commitTransactionAction(): CommitTransactionAction {
    return {type: COMMIT_TRANSACTION_ACTION_TYPE};
}

export const REJECT_TRANSACTION_ACTION_TYPE = 'RejectTransactionAction';
export interface RejectTransactionAction extends ActionInTransaction {
    type: typeof REJECT_TRANSACTION_ACTION_TYPE;
    payload: {
        reason: any;
    }
}
export function rejectTransactionAction(reason: any): RejectTransactionAction {
    return {type: REJECT_TRANSACTION_ACTION_TYPE, payload: {reason}};
}


export const CANCEL_TRANSACTION_ACTION_TYPE = 'CancelTransactionAction';
export interface CancelTransactionAction extends ActionInTransaction {
    type: typeof CANCEL_TRANSACTION_ACTION_TYPE;
}
export function cancelTransactionAction(): CancelTransactionAction {
    return {type: CANCEL_TRANSACTION_ACTION_TYPE};
}

export const TIMEOUT_TRANSACTION_ACTION_TYPE = 'TimeoutTransactionAction';
export interface TimeoutTransactionAction extends ActionInTransaction {
    type: typeof TIMEOUT_TRANSACTION_ACTION_TYPE;
}
export function timeoutTransactionAction(): TimeoutTransactionAction {
    return {type: TIMEOUT_TRANSACTION_ACTION_TYPE};
}

export type TransactionActions = StartTransactionAction | CommitTransactionAction | RejectTransactionAction | CancelTransactionAction | TimeoutTransactionAction;