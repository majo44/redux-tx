import {expect} from '../utils/expect';
import * as sinon from "sinon";
import {Action, Reducer} from 'redux';
import {transactionReducer} from "../../index";
import {
    CANCEL_TRANSACTION_ACTION_TYPE, COMMIT_TRANSACTION_ACTION_TYPE, REJECT_TRANSACTION_ACTION_TYPE, START_TRANSACTION_ACTION_TYPE,
    TIMEOUT_TRANSACTION_ACTION_TYPE
} from '../../lib/actions';


describe('reducer', () => {

    let orgReducer: Reducer<any>;
    let orgState: any;
    let reducer: Reducer<any>;

    beforeEach(() => {
        orgState = {};
        orgReducer = sinon.spy((s: any, action: any) => {
            if (action.newInstance) {
                return Object.assign({}, s);
            } else {
                return s;
            }
        });
        reducer = transactionReducer(orgReducer);
    });

    describe('for action outside of transaction', () => {
        it('should call orgReducer', () => {
            let action = {type: 'any', newInstance: true};
            reducer(orgState, action);
            expect(orgReducer).to.be.calledOnce;
            expect(orgReducer).to.be.calledWith(orgState, action);
            action = {type: 'any', newInstance: false};
            reducer(orgState, action);
            expect(orgReducer).to.be.calledTwice;
            expect(orgReducer).to.be.calledWith(orgState, action);
        });

        it('should coppy $$transactions', () => {
            let action = {type: 'any', newInstance: true};
            orgState.$$transactions = {};
            expect(reducer(orgState, action).$$transactions).to.eq(orgState.$$transactions);
        });
    });

    describe('inside transaction', () => {
        it('for other actions and not existing transaction should just return state', () => {
            let action = {type: 'any', meta: {transactionId: 1}};
            expect(reducer(orgState, action)).to.eq(orgState);
            orgState.$$transactions = {};
            expect(reducer(orgState, action)).to.eq(orgState);
        });

        it('for other actions should call the orgReducer over the transaction state ', () => {
            let action = {type: 'any', meta: {transactionId: 1}};
            let txState = {};
            orgState.$$transactions = {1: {state: txState}};
            let newState = reducer(orgState, action);
            expect(orgReducer).to.be.calledOnce;
            expect(orgReducer).to.be.calledWith(txState, action);
        });

        it('for other actions should when there is no transaction state, tx state shuold be set', () => {
            let action = {type: 'any', meta: {transactionId: 1}};
            let txState = {i: 1};
            orgState.$$transactions = {1: {beforeState: txState}};
            expect(reducer(orgState, action).$$transactions[1].state.i).eq(1);
        });

        it('for StartTransactionAction it should set new transaction in state', () => {
            let action = {
                type: START_TRANSACTION_ACTION_TYPE,
                payload: {transactionName: "a"},
                meta: {transactionId: 1}};
            let newState = reducer(orgState, action);
            expect(newState.$$transactions[1]).to.not.be.undefined;
            expect(newState.$$transactions[1].name).eq('a');
            expect(newState.$$transactions[1].beforeState).to.not.be.undefined;
        });

        it('for reject actions it should remove transaction from state', () => {
            let action = {
                type: CANCEL_TRANSACTION_ACTION_TYPE,
                meta: {transactionId: 1}};
            orgState.$$transactions = {1: {}};
            let newState = reducer(orgState, action);
            expect(newState.$$transactions).to.be.undefined;

            action = {
                type: REJECT_TRANSACTION_ACTION_TYPE,
                meta: {transactionId: 1}};
            orgState.$$transactions = {1: {}, 2: {}};
            newState = reducer(orgState, action);
            expect(newState.$$transactions[1]).to.be.undefined;

            action = {
                type: TIMEOUT_TRANSACTION_ACTION_TYPE,
                meta: {transactionId: 1}};
            orgState.$$transactions = {1: {}, 2: {}};
            newState = reducer(orgState, action);
            expect(newState.$$transactions[1]).to.be.undefined;
        });

        it('for commit action should merge changes to the state', () => {
            let action = {
                type: COMMIT_TRANSACTION_ACTION_TYPE,
                meta: {transactionId: 1}};
            orgState.$$transactions = {1: {state: {a: 1}, beforeState: {}}};
            let newState = reducer(orgState, action);
            expect(newState.a).eq(1);
        })
    });
});
