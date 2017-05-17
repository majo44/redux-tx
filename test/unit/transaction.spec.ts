import {expect} from '../utils/expect';
import * as sinon from "sinon";
import {setTransactionTimeout, transaction} from '../../lib/transaction';
import {
    CANCEL_TRANSACTION_ACTION_TYPE, COMMIT_TRANSACTION_ACTION_TYPE, REJECT_TRANSACTION_ACTION_TYPE,
    START_TRANSACTION_ACTION_TYPE, TIMEOUT_TRANSACTION_ACTION_TYPE
} from '../../lib/actions';
import {semaphore} from '../utils/promise';

describe('transaction', () => {
    let dispatch: sinon.SinonSpy;
    let state: any;

    beforeEach(() => {
        dispatch = sinon.spy();
    });

    it('should dispatch start and commit on transaction ', () => {
        let txBody = sinon.spy(() => {});
        let tx = transaction(dispatch, txBody);
        expect(txBody).to.be.calledOnce;
        expect(dispatch).to.be.calledTwice;
        expect(dispatch.args[0][0].type).eq(START_TRANSACTION_ACTION_TYPE);
        expect(dispatch.args[1][0].type).eq(COMMIT_TRANSACTION_ACTION_TYPE);
    });

    it('should have proper livecycle state', async () => {
        let txBody = sinon.spy(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    expect(tx.state).eq('PENDING');
                    resolve();
                },1);
            });
        });
        let tx = transaction(dispatch, txBody);
        await tx;
        expect(tx.state).eq('COMMITED');
        expect(txBody).to.be.calledOnce;
        expect(dispatch.args[0][0].type).eq(START_TRANSACTION_ACTION_TYPE);
    });

    it('should deliver proper name', () => {
        let txBody = sinon.spy(() => {});
        let tx = transaction('name', dispatch, txBody);
        expect(dispatch.args[0][0].payload).eql({transactionName: 'name'});
    });

    it('should support cancelation', async () => {
        let sem = semaphore();
        let txBody = sinon.spy(async () => {
            await sem;
        });
        let tx = transaction(dispatch, txBody);
        tx.cancel();
        expect(dispatch).to.be.calledTwice;
        expect(dispatch.args[0][0].type).eq(START_TRANSACTION_ACTION_TYPE);
        expect(dispatch.args[1][0].type).eq(CANCEL_TRANSACTION_ACTION_TYPE);
        expect(tx.state).eq('CANCELLED');
        sem.continue();
    });

    it('should support rejection from promise', async () => {
        let txBody = sinon.spy(async () => {throw 'Error'});
        let tx = transaction(dispatch, txBody);
        let errorSpy = sinon.spy();
        try {
            await tx;
        } catch (ex) {
            errorSpy(ex);
        }
        expect(errorSpy).to.be.calledOnce;
        expect(errorSpy).to.be.calledWith('Error');
        expect(dispatch).to.be.calledTwice;
        expect(dispatch.args[0][0].type).eq(START_TRANSACTION_ACTION_TYPE);
        expect(dispatch.args[1][0].type).eq(REJECT_TRANSACTION_ACTION_TYPE);
        expect(tx.state).eq('REJECTED');
    });

    it('should support rejection from promise without timout', async () => {
        let txBody = sinon.spy(async () => {throw 'Error'});
        let tx = transaction(dispatch, txBody, 0);
        let errorSpy = sinon.spy();
        try {
            await tx;
        } catch (ex) {
            errorSpy(ex);
        }
        expect(tx.state).eq('REJECTED');
    });

    it('should throw timeout exception', async () => {
        let sem = semaphore();
        let errorSpy = sinon.spy();
        let txBody = sinon.spy(async () => {
            await sem;
        });
        let tx = transaction(dispatch, txBody, 10);
        setTimeout(() => {
            sem.continue();
        }, 20);
        try {
            await tx;
        } catch(ex) {
            errorSpy(ex);
        }
        expect(errorSpy).to.be.called;
        expect(dispatch).to.be.calledTwice;
        expect(dispatch.args[0][0].type).eq(START_TRANSACTION_ACTION_TYPE);
        expect(dispatch.args[1][0].type).eq(TIMEOUT_TRANSACTION_ACTION_TYPE);
        expect(tx.state).eq('TIMEOUTED');
    });

    it('should support setting timeout globally', async () => {
        setTransactionTimeout(10);
        let sem = semaphore();
        let errorSpy = sinon.spy();
        let txBody = sinon.spy(async () => {
            await sem;
        });
        let tx = transaction(dispatch, txBody);
        setTimeout(() => {
            sem.continue();
        }, 20);
        try {
            await tx;
        } catch(ex) {
            errorSpy(ex);
        }
        expect(errorSpy).to.be.called;
    });

    it('should support disabling timeout', async () => {
        setTransactionTimeout(10);
        let sem = semaphore();
        let errorSpy = sinon.spy();
        let txBody = sinon.spy(async () => {
            await sem;
        });
        let tx = transaction(dispatch, txBody, 0);
        setTimeout(() => {
            sem.continue();
        }, 20);
        try {
            await tx;
        } catch(ex) {
            errorSpy(ex);
        }
        expect(errorSpy).to.not.be.called;
    });

    it('should do nothing if cancel is after commit', async () => {
        let txBody = sinon.spy(async () => {});
        let tx = transaction(dispatch, txBody);
        await tx;
        tx.cancel();
        expect(tx.state).eq('COMMITED');
    });

    it('should do nothing if error is thrown after cancel', async () => {
        let sem = semaphore();
        let txBody = sinon.spy(async () => {
            await sem;
            throw 'Error'
        });
        let tx = transaction(dispatch, txBody, 0);
        tx.cancel();
        sem.continue();
        await tx;
        expect(tx.state).eq('CANCELLED');
    });


});
