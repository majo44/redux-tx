import {expect} from '../utils/expect';
import {Action, applyMiddleware, combineReducers, createStore, Dispatch, Store} from 'redux';
import {transaction, TRANSACTION_ID_ZONE_KEY, TransactionPromise} from '../../lib/transaction';
import {transactionReducer} from '../../lib/reducer';
import  thunk from 'redux-thunk';
import {transactionMiddleware} from '../../lib/middleware';

describe('e2e example1', () => {

    const SearchExecutedActionType = 'SearchExecuted';

    interface SearchExecutedAction extends Action {
        type: typeof SearchExecutedActionType;
        payload: {
            query: string;
        };
    }

    function searchExecutedAction(query: string): SearchExecutedAction {
        return {
            type: SearchExecutedActionType,
            payload: {query}
        };
    }


    const SearchSuccessActionType = 'SearchSuccess';

    interface SearchSuccessAction extends Action {
        type: typeof SearchSuccessActionType;
        payload: {
            results: Array<string>;
        };
    }

    function searchSuccessAction(results: Array<string>): SearchSuccessAction {
        return {
            type: SearchSuccessActionType,
            payload: {results}
        };
    }


    type MyActions = SearchExecutedAction | SearchSuccessAction;

    interface SearchState {
        query?: string;
        results?: Array<string>;
    }

    function searchReducer(state: SearchState = {}, action: MyActions): SearchState {
        switch (action.type) {
            case SearchExecutedActionType: {
                return Object.assign({}, {
                    query: action.payload.query,
                    results: undefined
                });
            }
            case SearchSuccessActionType: {
                return Object.assign({}, state, {
                    results: action.payload.results
                });
            }
        }
        return state;
    }

    interface MyState {
        search: SearchState;
    }

    let service: (query: string) => Promise<Array<string>>;
    let tx: TransactionPromise;

    it('simple transaction', async () => {
        service = (query: string): Promise<Array<string>> => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve([query]);
                }, 10);
            });
        };

        function executeSearch(query: string) {
            return function (dispatch: Dispatch<SearchState>): Promise<void> {
                if (tx && tx.state === 'PENDING') {
                    tx.cancel();
                }
                tx = transaction('searchTransaction', dispatch, async (): Promise<void> => {
                    dispatch(searchExecutedAction(query));
                    dispatch(searchSuccessAction(
                        await service(query)));
                });
                return tx;
            };
        }

        const store: Store<MyState> = createStore(
            transactionReducer(combineReducers<MyState>({
                search: searchReducer
            })),
            applyMiddleware(thunk, transactionMiddleware)
        );

        await store.dispatch(executeSearch('aa'));
        expect(store.getState().search.query).eq('aa');
        expect(store.getState().search.results).eql([ 'aa']);

    });



    it('transaction within transaction', async () => {
        service = (query: string): Promise<Array<string>> => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve([query]);
                }, 10);
            });
        };

        function executeSearch(query: string) {
            return function (dispatch: Dispatch<SearchState>): Promise<void> {
                if (tx && tx.state === 'PENDING') {
                    tx.cancel();
                }
                tx = transaction('searchTransaction', dispatch, async (): Promise<void> => {
                    dispatch(searchExecutedAction(query));
                    dispatch(searchSuccessAction(
                        await service(query)));
                    await transaction('searchTransaction', dispatch, async (): Promise<void> => {
                        dispatch((subdispatch: Dispatch<any>, getState: () => MyState) => {
                            let beforeState = (<any>getState()).$$transactions[Zone.current.get(TRANSACTION_ID_ZONE_KEY)].beforeState;
                            expect(beforeState).eql({ search: { query: 'aa', results: [ 'aa' ] } });
                        });
                    });
                });
                return tx;
            };
        }

        const store: Store<MyState> = createStore(
            transactionReducer(combineReducers<MyState>({
                search: searchReducer
            })),
            applyMiddleware(thunk, transactionMiddleware)
        );

        await store.dispatch(executeSearch('aa'));
        expect(store.getState().search.query).eq('aa');
        expect(store.getState().search.results).eql(['aa']);

    });

});
