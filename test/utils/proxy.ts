import * as proxyquire from 'proxyquire';
let proxyquireLib: any = proxyquire.noCallThru();
proxyquireLib = proxyquireLib.noPreserveCache();
export function proxy(module: string, proxies: {[key:string] : any}) : any {
    module = '../..' + module;
    // let evaluatedProxies: {[key:string] : any} = {};
    // Object.keys(proxies).forEach((key) => {
    //     if (key.startsWith('/')) {
    //         evaluatedProxies['../..' + key] = proxies[key];
    //     }
    // });
    return proxyquireLib(module, proxies);
}
