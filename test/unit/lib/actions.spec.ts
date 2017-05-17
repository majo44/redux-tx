import {expect} from '../../utils/expect';
import {
    CANCEL_TRANSACTION_ACTION_TYPE,
    cancelTransactionAction,
    COMMIT_TRANSACTION_ACTION_TYPE, commitTransactionAction, REJECT_TRANSACTION_ACTION_TYPE, rejectTransactionAction,
    START_TRANSACTION_ACTION_TYPE,
    startTransactionAction, TIMEOUT_TRANSACTION_ACTION_TYPE, timeoutTransactionAction
} from '../../../lib/actions';

describe('action factory', () => {

    it('startTransactionAction should return proper action', () => {
        expect(startTransactionAction('name')).eql({
            type: START_TRANSACTION_ACTION_TYPE,
            payload: {
                transactionName: 'name'
            }
        });
    });

    it('commitTransactionAction should return proper action', () => {
        expect(commitTransactionAction()).eql({
            type: COMMIT_TRANSACTION_ACTION_TYPE,
        });
    });

    it('rejectTransactionAction should return proper action', () => {
        expect(rejectTransactionAction('reason')).eql({
            type: REJECT_TRANSACTION_ACTION_TYPE,
            payload: {
                reason: 'reason'
            }
        });
    });

    it('cancelTransactionAction should return proper action', () => {
        expect(cancelTransactionAction()).eql({
            type: CANCEL_TRANSACTION_ACTION_TYPE
        });
    });

    it('timeoutTransactionAction should return proper action', () => {
        expect(timeoutTransactionAction()).eql({
            type: TIMEOUT_TRANSACTION_ACTION_TYPE
        });
    });

});
