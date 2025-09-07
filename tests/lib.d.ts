export declare class AssertionError extends Error {
}
export declare function assert(condition: boolean, errorMessage?: null | string | {
    (): string;
}): void;
export declare function asyncPause(ms?: number): Promise<void>;
