import {Reducer} from 'redux';
import {optimisticMerge} from './utils/optimisticMerge';
import {
    CANCEL_TRANSACTION_ACTION_TYPE,
    REJECT_TRANSACTION_ACTION_TYPE, START_TRANSACTION_ACTION_TYPE,
    TransactionActions, TIMEOUT_TRANSACTION_ACTION_TYPE, COMMIT_TRANSACTION_ACTION_TYPE,
    } from './actions';


export interface Transaction {
    name: string,
    state?: StateWithTransactions,
    beforeState?: StateWithTransactions
}

export interface StateWithTransactions {
    [key: string]: any,
    $$transactions: {
        [transactionId: number]: Transaction
    }
}

/**
 * Create the reducer which branching the state between the transactions.
 * @param reducer wrapped application reducer.
 */
export function transactionReducer<S>(reducer: Reducer<S>): Reducer<S> {
    return function(state: S & StateWithTransactions, action: TransactionActions): S {
        if (action.meta && action.meta.transactionId) {
            let transactionId = action.meta.transactionId;
            switch (action.type) {
                case START_TRANSACTION_ACTION_TYPE: {
                    // on transaction start we
                    // will copy state to transaction
                    let beforeState = Object.assign({}, state);
                    // and we have to remove cycle
                    delete beforeState.$$transactions;
                    // updating list of transactions
                    let transactions = Object.assign({}, state.$$transactions);
                    transactions[transactionId] = {
                        name: action.payload.transactionName,
                        beforeState
                    };
                    // and return state with updated list of transactions
                    return Object.assign({}, state, {
                        $$transactions: transactions
                    });
                }
                case CANCEL_TRANSACTION_ACTION_TYPE:
                case REJECT_TRANSACTION_ACTION_TYPE:
                case TIMEOUT_TRANSACTION_ACTION_TYPE: {
                    // on rejection/cancelation/timeout we will just remove transaction from state
                    let transactions = Object.assign({}, state.$$transactions);
                    delete transactions[transactionId];
                    let result = Object.assign({}, state);
                    setTransactionsOnState(result, transactions);
                    return result;
                }
                case COMMIT_TRANSACTION_ACTION_TYPE: {
                    // on commit
                    let transaction = state.$$transactions[transactionId];
                    // we will optimistically merge the states
                    let newState = optimisticMerge(state, transaction.beforeState, transaction.state);
                    // remove the transaction
                    let transactions = Object.assign({}, state.$$transactions);
                    delete transactions[transactionId];

                    setTransactionsOnState(newState, transactions);

                    // and return the state
                    return newState;
                }
                default: {
                    // on any other action
                    let transaction;
                    if (state.$$transactions) {
                        transaction = state.$$transactions[transactionId];
                    }
                    if (transaction) {
                        // if there still is a transaction
                        if (!transaction.state) {
                            // if transaction still do not have own state
                            // we will use before transaction state to init it
                            transaction.state = Object.assign({}, transaction.beforeState);
                        }
                        // we will use provided reducer but over the state in transaction
                        let newTransactionState: StateWithTransactions = <any> reducer(<any>transaction.state, action);
                        // and at the end we will set the state in transaction instead of returning it
                        return Object.assign({}, state, {
                            $$transactions: Object.assign({}, state.$$transactions, {
                                [transactionId]: Object.assign({}, state.$$transactions[transactionId], {
                                    state: newTransactionState
                                })
                            })
                        });
                    } else {
                        // We are ignoring actions which are targeting the transactions which are not exists
                        return state;
                    }
                }
            }
        } else {
            // outside of transaction we all calling reducer directly ...
            let newState: StateWithTransactions = <StateWithTransactions> <any> reducer(state, action);
            if (newState !== state) {
                // if state was changed
                if (state && state.$$transactions) {
                    // we will copy the transactions
                    newState.$$transactions = state.$$transactions;
                }
            }
            return <any> newState
        }
    }
}


function setTransactionsOnState(state: StateWithTransactions, transactions: {[transactionId: number]: Transaction}): void {
    if (Object.keys(transactions).length < 1) {
        delete state.$$transactions
    } else {
        state.$$transactions = transactions
    }
}