export function noStopPromise() {
    return (promise) => promise;
}
function withStopPromise(stopPromise) {
    return async (promise) => await Promise.race([stopPromise, promise]);
}
export class StopError extends Error {
}
function newPromiseWithResolvers() {
    // handmade Promise.withResolvers, compatible with es2015
    let res;
    let rej;
    let p = new Promise((resolve, reject) => { res = resolve; rej = reject; });
    return { promise: p, resolve: res, reject: rej };
}
export class StopObject {
    // what we send to the execution flow to interrupt it
    orStop;
    stopSignal;
    donePromise;
    doneSignal;
    constructor() {
        let prrStop = newPromiseWithResolvers();
        let prrDone = newPromiseWithResolvers();
        this.orStop = withStopPromise(prrStop.promise);
        this.stopSignal = () => prrStop.reject(new StopError('interrupted by user'));
        this.donePromise = prrDone.promise;
        this.doneSignal = () => prrDone.resolve();
    }
}
async function interruptAndWaitPrevious(previous) {
    previous.stopSignal();
    await previous.donePromise;
}
async function waitPrevious(orStop, previous) {
    // while we are waiting, our successor can interrupt us - and, therefore, previous too.
    try {
        await orStop(previous.donePromise);
    }
    catch (e) {
        if (e instanceof StopError) {
            await interruptAndWaitPrevious(previous);
        }
        throw e;
    }
}
export function suppressStopError(e) {
    if (e instanceof StopError) {
        console.warn('stask stopped', e);
    }
    else {
        throw e;
    }
}
export class Sequencer {
    current = null;
    async tryExecuteStoppable(asyncBody, interrupt = true) {
        // shift in new StopObject, this will make our successors to stop and wait for us
        let previous = this.current;
        let current = new StopObject();
        this.current = current;
        try {
            if (previous) {
                if (interrupt) {
                    await interruptAndWaitPrevious(previous);
                }
                else {
                    await waitPrevious(current.orStop, previous);
                }
            }
            return await current.orStop(asyncBody(current.orStop));
        }
        finally {
            current.doneSignal();
            // await current.donePromise
            if (this.current == current) {
                // nobody is enqueued yet
                this.current = null;
            }
        }
    }
    async tryExecuteSimple(asyncBody, interrupt = true) {
        // just ignore orStop, run normally till the end
        return this.tryExecuteStoppable(async (_) => await asyncBody(), interrupt);
    }
    async executeStoppable(asyncBody, interrupt = true) {
        try {
            await this.tryExecuteStoppable(asyncBody, interrupt);
        }
        catch (e) {
            suppressStopError(e);
        }
    }
    async executeSimple(asyncBody, interrupt = true) {
        try {
            await this.tryExecuteSimple(asyncBody, interrupt);
        }
        catch (e) {
            suppressStopError(e);
        }
    }
}
