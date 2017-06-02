# redux-tx
[![Build Status](https://travis-ci.org/majo44/redux-tx.svg?branch=master)](https://travis-ci.org/majo44/redux-tx)
[![Coverage Status](https://coveralls.io/repos/github/majo44/redux-tx/badge.svg?branch=master)](https://coveralls.io/github/majo44/redux-tx?branch=master)
[![codebeat badge](https://codebeat.co/badges/7eee07b4-cd8f-43fb-8dfd-53f2c18ae7c8)](https://codebeat.co/projects/github-com-majo44-redux-tx-master)
[![bitHound Overall Score](https://www.bithound.io/github/majo44/redux-tx/badges/score.svg)](https://www.bithound.io/github/majo44/redux-tx)
[![npm version](https://badge.fury.io/js/redux-tx.svg)](https://badge.fury.io/js/redux-tx)

When the redux-sagas are to much, and the redux-thunk is not enough.
 
### Dependencies

* Redux-tx is for the redux, so you will need it. 
* Internally it is using using zone.js.
* And redux-tx is plays best with redux-thunk. 


### Overview
The main pompous of this lib is to simplify the way of working with the async action. 
The one think what it is giving for you is possibility for encapsulated multiple async
state mutations in one time state drop.
The second think is possibility for async actions cancellation.   

Redux-tx is a small library which allows you to execute actions in transaction. 
If some set of actions will be dispatched within transaction, the global state will be not updated until the transaction will be not committed.
All of such actions will modify the copy of state. Such transaction can be simple cancelled, and then your state will be not touched. 
If transaction will failed (the exception will be throw within transaction) the transaction 
will rollback automatically. Transactions supports also timeouts, so if transaction will take more than some time (default 1min), 
transaction will throw exception, and will be rollback. 

##### Dev tools support
Redux-tx is fully supporting redux dev tools. 

##### Optimistic lock
For solving the race problem we are using Optimistic Lock solution on each primitive value in the state. This mean that you are able to 
run multiple transactions in parallel, or transaction and synchronous actions as far as you do not mutate same values in state.   

### Usage

##### Installation

To install the stable version:

```
npm install --save redux-tx
```

##### Configure storage
To use transactions we have to configure storage by wrapping reducer by `transactionReducer` and add `transactionMiddleware` to the 
middleware:

```
import {applyMiddleware, combineReducers, createStore} from 'redux';
import {transactionReducer, transactionMiddleware} from 'redux-tx';
import thunk from 'redux-thunk';

const store = createStore(
    // we can use combined reducer, but we can use also regular one
    // but important is that we have to wrap top level reducer 
    transactionReducer(combineReducers({
        search: myReducer
    })),
    applyMiddleware(thunk, transactionMiddleware)
);
```

To run the transaction you simple have to dispatch your action in transaction closure:
  
```
import {transaction} from 'redux-tx';

// transaction function returns augmented Promise object
let tx = transaction(async () => {
    await store.dispatch(someAsyncThunkAction());
})

tx.then(() => {
   // transaction was commited, the state is modified.
    console.log(tx.state); // => 'COMMITED'
});

tx.catch(() => {
   // transaction throwed error, the state is not modified.
   console.log(tx.state); // => 'REJECTED'
});
```

To cancel transaction you are have to call `cancel` function on transaction Promise

```
import {transaction} from 'redux-tx';

// transaction function returns augmented Promise object
let tx = transaction(async () => {
    await store.dispatch(someAsyncThunkAction());
})

tx.then(() => {
    // then will be called even on cancelled transaction but you can check the state of transaction
    console.log(tx.state); // => 'CANCELLED'
});

tx.cancel();
```

### How it works
1. When you are calling `transaction` function redux-tx is 
   * creating new zone
   * dispatching `StartTransactionAction` action
   * reducer for `StartTransactionAction` is creating new state branch with the copy of current state
2. When you dispatching action within the transaction
   * the action is marked by middleware with the transaction identifier (taken from zone)
   * your reducer is getting the state from brunch instead of root reference 
   * if you mutate state, all mutations are going to the branch instead of root reference
3. After finish of transaction if any exception was not thrown and transaction was not cancelled
   * `CommitTransactionAction` action is dispatched
   * reducer is merging the state from transaction in to root state reference, 
   merge is comparing current state with the state which application had on transaction start (beforeState), 
   to distinguish there was Race occurs
      * if race occurs the exception will be thrown, transaction promise will be rejected with exception 
      * if there is no race, transaction promise will be resolved, and the root state reference is mutated
4. If there was exception thrown within the transaction
   * `RejectTransactionAction` action is dispatched
   * reducer is removing the branch from state
   * transaction promise will be rejected with exception 
5. If there timeout occurs within the transaction
   * `TimeoutTransactionAction` action is dispatched
   * reducer is removing the branch from state
   * transaction promise will be rejected with transaction timeout exception 
6. If during the transaction processing there will be a cancellation
   * `CancelTransactionAction` action is dispatched
   * reducer is removing the branch from state
   * transaction promise will be resolved
         
[Live example (please use dev tool)](https://www.webpackbin.com/bins/-KlcUSQD6UKw5UqCQMxu)
                    
[![Live example](http://img.youtube.com/vi/VyLqx3L84MY/0.jpg)](https://youtu.be/VyLqx3L84MY "Live example")                    

### Api

```typescript
/**
 * Transaction phase constant values. 
 */
type TransactionPhase = 'CANCELLED' | 'REJECTED' | 'COMMITED' | 'TIMEOUTED' | 'PENDING';
```
```typescript
/**
 * Promise with possibility to cancel with state flags.
 */
interface TransactionPromise extends Promise<void> {
    /**
     * Current state of transaction. 
     */
    state: TransactionPhase;
    /**
     * Break the transaction. 
     */
    cancel(): void;
}
```
```typescript
/**
 * Run code in transaction.
 * @param dispatch redux dispatch function
 * @param tx the transaction code
 * @param timeout optional timeout for transaction, if not provided, the global one will be used, the default is 1 min
 */
function transaction(dispatch: Dispatch<any>, tx: () => void | Promise<void>, timeout?: number): TransactionPromise;
```
```typescript
/**
 * Run code in transaction.
 * @param name name of transaction
 * @param dispatch redux dispatch function
 * @param tx the transaction code
 * @param timeout optional timeout for transaction, if not provided, the global one will be used, the default is 1 min
 */
function transaction(name: string, dispatch: Dispatch<any>, tx: () => void | Promise<void>, timeout?: number): TransactionPromise;
```
```typescript
/**
 * Sets default timeout for all transactions.
 * @param timeout
 */
function setTransactionTimeout(timeout: number): void;
```
```typescript
/**
 * Action transactions enhance middleware.
 * This middleware is responsible for mark action with transaction id, and reject actions which are targeting not existing.
 */
function transactionMiddleware<S>(api: MiddlewareAPI<S>): (next: Dispatch<S>) => Dispatch<S>;
```
```typescript
/**
 * Create the reducer which branching the state between the transactions.
 * @param reducer wrapped application reducer.
 */
function transactionReducer<S>(reducer: Reducer<S>): Reducer<S>;
```