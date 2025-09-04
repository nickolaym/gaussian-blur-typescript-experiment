export declare function orStop<T>(stopPromise: Promise<void>, cargoPromise: Promise<T>): Promise<T>;
export type RejectorFunc = () => void;
export type StopPromiseAndRejector = {
    stopPromise: Promise<void>;
    rejector: RejectorFunc;
};
export declare class StopError extends Error {
}
export declare function newStopPromiseAndRejector(): StopPromiseAndRejector;
