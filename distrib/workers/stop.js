export function noStopPromise() {
    return { promise: null, raised: false };
}
export async function orStop(stopPromise, cargoPromise) {
    return await Promise.race([stopPromise.promise, cargoPromise]);
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
    stopPromise;
    stopSignal;
    donePromise;
    doneSignal;
    constructor() {
        let prrStop = newPromiseWithResolvers();
        let prrDone = newPromiseWithResolvers();
        this.stopPromise = { promise: prrStop.promise, raised: false };
        this.stopSignal = () => {
            this.stopPromise.raised = true;
            prrStop.reject(new StopError('interrupted by user'));
        };
        this.donePromise = prrDone.promise;
        this.doneSignal = () => prrDone.resolve();
    }
}
async function interruptAndWaitPrevious(previous) {
    previous.stopSignal();
    await previous.donePromise;
}
async function waitPrevious(stopPromise, previous) {
    // while we are waiting, our successor can interrupt us - and, therefore, previous too.
    try {
        await orStop(stopPromise, previous.donePromise);
    }
    catch (e) {
        if (e instanceof StopError) {
            interruptAndWaitPrevious(previous);
        }
        throw e;
    }
}
export class StopHost {
    current = null;
    async executeStoppable(asyncBody, interrupt = true) {
        // shift in new StopObject, this will make our successors to stop and wait for us
        let previous = this.current;
        let current = new StopObject();
        this.current = current;
        try {
            if (previous) {
                if (interrupt) {
                    interruptAndWaitPrevious(previous);
                }
                else {
                    waitPrevious(current.stopPromise, previous);
                }
            }
            return await orStop(current.stopPromise, asyncBody(current.stopPromise));
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
    async executeSimple(asyncBody, interrupt = true) {
        // just ignore stopPromise, run normally till the end
        return this.executeStoppable(async (_) => await asyncBody(), interrupt);
    }
}
