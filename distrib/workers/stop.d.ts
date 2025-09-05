export type StopPromise = {
    promise: Promise<void>;
    raised: boolean;
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
export declare class StopHost {
    current: StopObject;
    executeStoppable<T>(asyncBody: (stopPromise: StopPromise) => Promise<T>, interrupt?: boolean): Promise<T>;
    executeSimple<T>(asyncBody: () => Promise<T>, interrupt?: boolean): Promise<T>;
}
