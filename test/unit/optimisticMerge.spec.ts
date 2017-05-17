import {expect} from '../utils/expect';
import {optimisticMerge} from '../../lib/utils/optimisticMerge';

describe('optimisticMerge', () => {

    it('should apply new val', () => {
        expect(optimisticMerge({}, {}, {a: 1}).a).eq(1);
    });

    it('should apply new val on nested object', () => {
        expect(optimisticMerge({a: {}}, {a: {}}, {a: {a: 1}}).a.a).eq(1);
    });

    it('should preserve old val', () => {
        expect(optimisticMerge({b: 2}, {}, {a: 1}).b).eq(2);
    });

    it('should throw exception on non plain objects', () => {
        expect(() => optimisticMerge([], [], [])).to.throw(/Transaction commit failed/);
        expect(() => optimisticMerge(2, 3, 4)).to.throw(/Transaction commit failed/);
    });

    it('should skip $$transactions', () => {
        expect(optimisticMerge({$$transactions: {}}, {}, {}).$$transactions).to.be.undefined;
    });

    it('should remove property if was changed only outside of transaction', () => {
        expect(optimisticMerge({}, {a: 1}, {a: 1}).a).to.be.undefined;
    });

    it('should remove property if was changed in transaction', () => {
        expect(optimisticMerge({a: 1}, {a: 1}, {}).a).to.be.undefined;
    });

    it('should throw exception if changes are in global and transaction', () => {
        expect(() => optimisticMerge({a: 1}, {a:2}, {a: 3})).to.throw(/The race detected/);
        expect(() => optimisticMerge({}, {a:2}, {a: 3})).to.throw(/The race detected/);
        expect(() => optimisticMerge({a: 3}, {a:2}, {})).to.throw(/The race detected/);
        expect(() => optimisticMerge({a: 3}, {}, {a:2})).to.throw(/The race detected/);
    });

    it('should throw exception if array instance changed', () => {
        expect(() => optimisticMerge({a: []}, {a:[]}, {a: []})).to.throw(/The race detected/);
    });

    it('should not throw exception if array instance not changed', () => {
        let array: Array<any> = [];
        let resarray: Array<any> = [];
        expect(optimisticMerge({a: array}, {a: array}, {a: resarray}).a).to.eq(resarray);
    });

});
