
type VoidFunc = () => void

export type StopPromise = {
    promise: Promise<void>
    raised: boolean
}

export function noStopPromise(): StopPromise {
    return { promise: null, raised: false }
}

export async function orStop<T> (stopPromise: StopPromise, cargoPromise: Promise<T>): Promise<T> {
    if (stopPromise.promise) {
        await Promise.race([stopPromise.promise, cargoPromise])
        // both promises may be settled before this point
        // but we must prioritize the event of stop
        if (stopPromise.raised) {
            // force throwing it
            await stopPromise.promise
            // somehow it may not throw, so let's do that again
            throw new StopError('interrupted by user')
        }
    }
    return await cargoPromise
}

export class StopError extends Error {}

function newPromiseWithResolvers() {
    // handmade Promise.withResolvers, compatible with es2015
    let res, rej
    let p = new Promise<void>((reject, resolve) => { res = resolve; rej = reject })
    return {promise: p, resolve: res, reject: rej }
}

export class StopObject {
    // what we send to the execution flow to interrupt it
    readonly stopPromise: StopPromise
    readonly stopSignal: ()=>void
    readonly donePromise: Promise<void>
    readonly doneSignal: ()=>void

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

export class StopHost {
    current: StopObject = null

    newStopObject() {
        if (this.current) {
            throw new Error('previous job is not properly finished!')
        }
        this.current = new StopObject()
        return this.current
    }

    async stop() {
        if (this.current) {
            let current = this.current
            current.stopSignal()
            try {
                await current.donePromise
            } catch (e) {
                console.warn(e)
            }
            console.log('awaited.')
        }
    }

    done() {
        if (!this.current) {
            throw new Error('current job is not properly initialized!')
        }
        this.current.doneSignal()
        this.current = null
    }
}
