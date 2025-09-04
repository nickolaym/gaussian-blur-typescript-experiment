
export async function orStop<T> (stopPromise: Promise<void>, cargoPromise: Promise<T>): Promise<T> {
    return await Promise.race([stopPromise, cargoPromise]) as Promise<T>
}

export type RejectorFunc = () => void

export type StopPromiseAndRejector = {
    stopPromise: Promise<void>
    rejector: RejectorFunc
}

export class StopError extends Error {}

export function newStopPromiseAndRejector(): StopPromiseAndRejector {
    let rejector: () => void
    let stopPromise = new Promise<void>((_, reject) => {
        rejector = () => reject(new StopError('execution interrupted by user'))
    })
    return { stopPromise: stopPromise, rejector: rejector }
}
