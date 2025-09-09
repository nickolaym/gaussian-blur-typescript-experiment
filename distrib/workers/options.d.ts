import { OrStopFunc } from './sequencer.js';
export type ProgressFunc = (percent: number) => void;
export type BlurWorkerOptions = {
    poolSize: number;
    crowdSize: number;
    progressFunc: ProgressFunc;
    orStop: OrStopFunc;
};
