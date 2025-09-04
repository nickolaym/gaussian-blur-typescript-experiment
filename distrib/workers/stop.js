export async function orStop(stopPromise, cargoPromise) {
    return await Promise.race([stopPromise, cargoPromise]);
}
export class StopError extends Error {
}
export function newStopPromiseAndRejector() {
    let rejector;
    let stopPromise = new Promise((_, reject) => {
        rejector = () => reject(new StopError('execution interrupted by user'));
    });
    return { stopPromise: stopPromise, rejector: rejector };
}
