export function optimisticMerge(outisde: any, before: any, after: any, path: Array<string> = []) {
    if (!isObject(outisde, before, after)) {
        throw 'Transaction commit failed. The state should bean an plain object.';
    }
    let target: any = {};
    uniq(Object.keys(after)
        .concat(Object.keys(before))
        .concat(Object.keys(outisde)))
        .forEach((key: string) => {
            if (key !== '$$transactions') {
                if (after[key] === before[key]) {
                    if (typeof outisde[key] !== 'undefined') {
                        target[key] = outisde[key];
                    }
                } else if (before[key] === outisde[key]) {
                    if (typeof after[key] !== 'undefined') {
                        target[key] = after[key];
                    }
                } else {
                    if (isObject(outisde[key], before[key], after[key])) {
                        target[key] = optimisticMerge(outisde[key], before[key], after[key], [...path, key]);
                    } else {
                        throw `The race detected. Property ${path.join('.')}.${key}` +
                        `of state updated during the transaction. Transactions trays` +
                        ` to commit new value to this same property.`;
                    }
                }
            }
        });
    return target;
}

function isObject(outisde: any,  before: any, after: any) {
    return typeof outisde === typeof before &&
        typeof before === typeof after &&
        typeof after === 'object' &&
        !Array.isArray(after);
}


function uniq(a: Array<any>): Array<any> {
    let seen: any = {};
    let out = [];
    let len = a.length;
    let j = 0;
    for (let i = 0; i < len; i++) {
        let item = a[i];
        if (seen[item] !== 1) {
            seen[item] = 1;
            out[j++] = item;
        }
    }
    return out;
}
