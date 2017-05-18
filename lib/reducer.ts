import {Reducer} from 'redux';
import {optimisticMerge} from './utils/optimisticMerge';
import {
    CANCEL_TRANSACTION_ACTION_TYPE,
    REJECT_TRANSACTION_ACTION_TYPE, START_TRANSACTION_ACTION_TYPE,
    TransactionActions, TIMEOUT_TRANSACTION_ACTION_TYPE, COMMIT_TRANSACTION_ACTION_TYPE, StartTransactionAction, CommitTransactionAction,
} from './actions';


export interface Transaction {
    name?: string;
    id: number;
    parentId?: number;
    state?: StateWithTransactions;
    beforeState?: StateWithTransactions;
}

export interface StateWithTransactions {
    [key: string]: any;
    $$transactions: {
        [transactionId: number]: Transaction;
    };
}

function removeTransaction(
    transactions: {[transactionId: number]: Transaction}, transactionToRemove: number): {[transactionId: number]: Transaction} {
    transactions = Object.assign({}, transactions);
    delete transactions[transactionToRemove];
    return transactions;
}

function updateTransaction(
    transactions: {[transactionId: number]: Transaction}, transactionToUpdate: Transaction): {[transactionId: number]: Transaction} {
    transactions = Object.assign({}, transactions);
    transactions[transactionToUpdate.id] = Object.assign({}, transactions[transactionToUpdate.id], transactionToUpdate);
    return transactions;
}


function setTransactionsOnState(state: StateWithTransactions, transactions: {[transactionId: number]: Transaction}): StateWithTransactions {
    if (!transactions || Object.keys(transactions).length < 1) {
        delete state.$$transactions;
    } else {
        state.$$transactions = transactions;
    }
    return state;
}

function reduceStartTransactionAction(state: StateWithTransactions, action: StartTransactionAction): any {
    // on transaction start we
    let transactions = state.$$transactions;
    if (action.meta.parentTransactionId && (!transactions || !transactions[action.meta.parentTransactionId])) {
        return state;
    }

    // will copy state to transaction
    let transactionId = action.meta.transactionId;
    let beforeState;

    if (action.meta.parentTransactionId) {
        beforeState = Object.assign({},
            transactions[action.meta.parentTransactionId].state ||
            transactions[action.meta.parentTransactionId].beforeState);
    } else {
        beforeState = Object.assign({}, state);
    }
    // and we have to remove cycle
    delete beforeState.$$transactions;

    // and return state with updated list of transactions
    return setTransactionsOnState(Object.assign({}, state),
        updateTransaction(transactions,  {
            id: transactionId,
            name: action.payload.transactionName,
            beforeState
        }));
}

function reduceRejectTransactionAction(state: StateWithTransactions, action: TransactionActions): any {
    // on rejection/cancelation/timeout we will just remove transaction from state
    return setTransactionsOnState(Object.assign({}, state),
        removeTransaction(state.$$transactions, action.meta.transactionId));
}


function reduceOtherActionInTransaction(state: StateWithTransactions, action: TransactionActions, reducer: Reducer<any>): any {
    // on any other action
    let transactions = state.$$transactions;
    let transactionId = action.meta.transactionId;

    if (transactions && transactions[transactionId]) {
        let transaction = transactions[transactionId];
        // if there still is a transaction
        if (!transaction.state) {
            // if transaction still do not have own state
            // we will use before transaction state to init it
            transaction.state = Object.assign({}, transaction.beforeState);
        }
        // we will use provided reducer but over the state in transaction
        let newTransactionState: StateWithTransactions = reducer(transaction.state, action);
        // and at the end we will set the state in transaction instead of returning it
        return setTransactionsOnState(Object.assign({}, state),
            updateTransaction(transactions, {
                id: transactionId,
                state: newTransactionState
            }));
    } else {
        // We are ignoring actions which are targeting the transactions which are not exists
        return state;
    }
}

function reduceCommitTransactionAction(state: StateWithTransactions, action: CommitTransactionAction): any {
    // on commit
    let transactions = state.$$transactions;
    let transactionId = action.meta.transactionId;
    let transaction = transactions[transactionId];

    // copping state && removing transaction
    state = Object.assign({}, state);
    transactions  = removeTransaction(transactions, transactionId);

    if (transaction.state) {
        if (transaction.parentId) {
            // we are merging to parent
            if (transactions && transactions[transaction.parentId]) {
                let parentTransaction = transactions[transaction.parentId];
                transactions = updateTransaction(transactions, {
                    id : transaction.parentId,
                    state: optimisticMerge(
                        parentTransaction.state || parentTransaction.beforeState, transaction.beforeState, transaction.state)
                });
            }
        } else {
            // we will optimistically merge the states
            // remove the transaction
            // and return the state
            state = optimisticMerge(state, transaction.beforeState, transaction.state);
        }
    }

    return setTransactionsOnState(state, transactions);
}


/**
 * Create the reducer which branching the state between the transactions.
 * @param reducer wrapped application reducer.
 */
export function transactionReducer<S>(reducer: Reducer<S>): Reducer<S> {
    return function(state: S & StateWithTransactions, action: TransactionActions): S {
        if (action.meta && action.meta.transactionId) {
            switch (action.type) {
                case START_TRANSACTION_ACTION_TYPE: {
                    return reduceStartTransactionAction(state, action);
                }
                case CANCEL_TRANSACTION_ACTION_TYPE:
                case REJECT_TRANSACTION_ACTION_TYPE:
                case TIMEOUT_TRANSACTION_ACTION_TYPE: {
                    return reduceRejectTransactionAction(state, action);
                }
                case COMMIT_TRANSACTION_ACTION_TYPE: {
                    return reduceCommitTransactionAction(state, action);
                }
                default: {
                    return reduceOtherActionInTransaction(state, action, reducer);
                }
            }
        } else {
            // outside of transaction we all calling reducer directly ...
            let newState: StateWithTransactions = <StateWithTransactions> <any> reducer(state, action);
            if (newState !== state && state && state && state.$$transactions) {
                // if state was changed we will copy the transactions
                newState.$$transactions = state.$$transactions;
            }
            return <any> newState;
        }
    };
}
