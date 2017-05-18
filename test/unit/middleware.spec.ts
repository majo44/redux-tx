import {expect} from '../utils/expect';
import 'zone.js';
import {transactionMiddleware} from '../../lib/middleware';
import {TRANSACTION_ID_ZONE_KEY} from '../../lib/transaction';
import {Dispatch, MiddlewareAPI} from 'redux';
import * as sinon from 'sinon';
import {START_TRANSACTION_ACTION_TYPE} from '../../lib/actions';


describe('middleeware', () => {

    let nextSpy: Dispatch<any>;
    let api: MiddlewareAPI<any>;
    let state: any;

    beforeEach(() => {
       nextSpy = sinon.spy();
       state = {
           $$transactions: {1: true}
       };
       api = {
            getState: () => {
                return state;
            },
            dispatch: (): any => {
                return;
            }
        };
    });


    it('should mark action with proper transaction id', () => {
        let action: any = {type: 'any'};
        Zone.current.fork({
            name: 'test',
            properties: {
                [TRANSACTION_ID_ZONE_KEY] : 1
            }
        }).run(() => {
            transactionMiddleware(api)(nextSpy)(action);
        });
        expect(nextSpy).to.be.calledOnce;
        expect(action.meta.transactionId).eq(1);
    });

    it('should not mark action with transaction id if action called outside of transaction', () => {
        let action: any = {type: 'any'};
        Zone.current.fork({
            name: 'test',
        }).run(() => {
            transactionMiddleware(api)(nextSpy)(action);
        });
        expect(nextSpy).to.be.calledOnce;
        expect(action.meta).to.be.undefined;
    });

    it('should throw exception if action is marked transaction id and transaction do not exists', () => {
        let action: any = {type: 'any', meta: {transactionId: 1}};
        state = {};
        Zone.current.fork({
            name: 'test',
            properties: {
                [TRANSACTION_ID_ZONE_KEY] : 1
            }
        }).run(() => {
            expect(() => transactionMiddleware(api)(nextSpy)(action)).to.throw(/IgnoreActionOnNotExistingTransaction/);
        });
    });

    it('should not throw exception if action is marked transaction ' +
        'id and transaction do not exists, but this is start transaction action', () => {
        let action: any = {type: START_TRANSACTION_ACTION_TYPE, meta: {transactionId: 1}};
        state = {};
        Zone.current.fork({
            name: 'test',
            properties: {
                [TRANSACTION_ID_ZONE_KEY] : 1
            }
        }).run(() => {
            transactionMiddleware(api)(nextSpy)(action);
        });
        expect(nextSpy).to.be.calledOnce;
    });
});
