export type StopPromise = {
    promise: Promise<void>;
};
export declare function noStopPromise(): StopPromise;
export declare function orStop<T>(stopPromise: StopPromise, cargoPromise: Promise<T>): Promise<T>;
export declare class StopError extends Error {
}
export declare class StopObject {
    readonly stopPromise: StopPromise;
    readonly stopSignal: () => void;
    readonly donePromise: Promise<void>;
    readonly doneSignal: () => void;
    constructor();
}
export declare function suppressStopError(e: Error): void;
export declare class StopHost {
    current: StopObject;
    tryExecuteStoppable<T>(asyncBody: (stopPromise: StopPromise) => Promise<T>, interrupt?: boolean): Promise<T>;
    tryExecuteSimple<T>(asyncBody: () => Promise<T>, interrupt?: boolean): Promise<T>;
    executeStoppable(asyncBody: (stopPromise: StopPromise) => Promise<void>, interrupt?: boolean): Promise<void>;
    executeSimple(asyncBody: () => Promise<void>, interrupt?: boolean): Promise<void>;
}
