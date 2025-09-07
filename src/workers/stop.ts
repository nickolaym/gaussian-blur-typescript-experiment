
type VoidFunc = () => void

export type StopPromise = {
    promise: Promise<void>
    raised: boolean
}

export function noStopPromise(): StopPromise {
    return { promise: null, raised: false }
}

export async function orStop<T> (stopPromise: StopPromise, cargoPromise: Promise<T>): Promise<T> {
    return await Promise.race([stopPromise.promise, cargoPromise]) as T
}

export class StopError extends Error {}

function newPromiseWithResolvers() {
    // handmade Promise.withResolvers, compatible with es2015
    let res: () => void
    let rej: (reason?: any) => void
    let p = new Promise<void>((resolve, reject) => { res = resolve; rej = reject })
    return {promise: p, resolve: res, reject: rej }
}

export class StopObject {
    // what we send to the execution flow to interrupt it
    readonly stopPromise: StopPromise
    readonly stopSignal: () => void
    readonly donePromise: Promise<void>
    readonly doneSignal: () => void

    constructor() {
        let prrStop = newPromiseWithResolvers()
        let prrDone = newPromiseWithResolvers()

        this.stopPromise = { promise: prrStop.promise, raised: false }
        this.stopSignal = () => {
            this.stopPromise.raised = true
            prrStop.reject(new StopError('interrupted by user'))
        }

        this.donePromise = prrDone.promise
        this.doneSignal = () => prrDone.resolve()
    }
}

async function interruptAndWaitPrevious(previous: StopObject) {
    previous.stopSignal()
    await previous.donePromise
}

async function waitPrevious(stopPromise: StopPromise, previous: StopObject) {
    // while we are waiting, our successor can interrupt us - and, therefore, previous too.
    try {
        await orStop(stopPromise, previous.donePromise)
    } catch (e) {
        if (e instanceof StopError) {
            interruptAndWaitPrevious(previous)
        }
        throw e
    }
}

export function suppressStopError(e: Error) {
    if (e instanceof StopError) {
        console.warn('stask stopped', e)
    } else {
        throw e
    }
}

export class StopHost {
    current: StopObject = null

    async tryExecuteStoppable<T>(
        asyncBody: (stopPromise: StopPromise) => Promise<T>,
        interrupt: boolean = true,
    ) {
        // shift in new StopObject, this will make our successors to stop and wait for us
        let previous = this.current
        let current = new StopObject()
        this.current = current

        try {
            if (previous) {
                if (interrupt) {
                    interruptAndWaitPrevious(previous)
                } else {
                    waitPrevious(current.stopPromise, previous)
                }
            }
            return await orStop(current.stopPromise, asyncBody(current.stopPromise))
        } finally {
            current.doneSignal()
            // await current.donePromise

            if (this.current == current) {
                // nobody is enqueued yet
                this.current = null
            }
        }
    }

    async tryExecuteSimple<T>(
        asyncBody: () => Promise<T>,
        interrupt: boolean = true,
    ) {
        // just ignore stopPromise, run normally till the end
        return this.tryExecuteStoppable(
            async (_: StopPromise) => await asyncBody(),
            interrupt,
        )
    }

    async executeStoppable(
        asyncBody: (stopPromise: StopPromise) => Promise<void>,
        interrupt: boolean = true,
    ) {
        try {
            await this.tryExecuteStoppable(asyncBody, interrupt)
        } catch (e) {
            suppressStopError(e)
        }
    }

    async executeSimple(
        asyncBody: () => Promise<void>,
        interrupt: boolean = true,
    ) {
        try {
            await this.tryExecuteSimple(asyncBody, interrupt)
        } catch (e) {
            suppressStopError(e)
        }
    }
}
