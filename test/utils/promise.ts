
export interface Semaphore extends Promise<void> {
    continue(error?: any): void;
    assert(fn: () => void): void;
}

export function timeoutPromise(value?: any, delay: number = 0): Promise<any> {
    return new Promise<any>((resolve: (x: any) => void) => {
        setTimeout(() => resolve(value), delay);
    });
}


export function semaphore(): Semaphore {
    let semaphoreInst: Semaphore = <Semaphore> {};
    semaphoreInst.assert = function(fn: () => void) {
        try {
            fn.apply(null);
            semaphoreInst.continue();
        } catch (ex) {
            semaphoreInst.continue(ex);
        }
    };
    let promise: Promise<void> = new Promise<void>((resolve: () => void, reject: (error: any) => void  ) => {
        semaphoreInst.continue = (error) => {
            if (error) {
                reject.call(promise, error);
            } else {
                resolve.apply(promise);
            }
        };
    });
    semaphoreInst.then = <any> function () {promise.then.apply(promise, arguments); };
    semaphoreInst.catch = <any> function () {promise.catch.apply(promise, arguments); };
    return semaphoreInst;
}
