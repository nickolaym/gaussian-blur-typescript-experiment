import { StopPromise } from './stop.js';
export type ProgressFunc = (percent: number) => void;
export type BlurWorkerOptions = {
    poolSize: number;
    crowdSize: number;
    progressFunc: ProgressFunc;
    stopPromise: StopPromise;
};
