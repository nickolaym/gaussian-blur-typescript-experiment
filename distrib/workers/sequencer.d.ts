export type OrStopFunc = <T>(promise: Promise<T>) => Promise<T>;
export declare function noStopPromise(): OrStopFunc;
export declare class StopError extends Error {
}
export declare class StopObject {
    readonly orStop: OrStopFunc;
    readonly stopSignal: () => void;
    readonly donePromise: Promise<void>;
    readonly doneSignal: () => void;
    constructor();
}
export declare function suppressStopError(e: Error): void;
export declare class Sequencer {
    current: StopObject;
    tryExecuteStoppable<T>(asyncBody: (orStop: OrStopFunc) => Promise<T>, interrupt?: boolean): Promise<T>;
    tryExecuteSimple<T>(asyncBody: () => Promise<T>, interrupt?: boolean): Promise<T>;
    executeStoppable(asyncBody: (orStop: OrStopFunc) => Promise<void>, interrupt?: boolean): Promise<void>;
    executeSimple(asyncBody: () => Promise<void>, interrupt?: boolean): Promise<void>;
}
