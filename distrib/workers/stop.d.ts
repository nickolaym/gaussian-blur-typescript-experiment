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
    newStopObject(): StopObject;
    stop(): Promise<void>;
    done(): void;
}
