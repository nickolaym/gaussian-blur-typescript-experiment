import { BlurWorkerOptions } from './options.js';
export declare const methodSingle = "single";
export declare const methodWorkers = "workers";
export declare const methodPool = "pool";
export declare const methodAdaptive = "adaptive";
export type Method = 'single' | 'workers' | 'pool' | 'adaptive';
export declare function asyncBlur(imgdata: ImageData, sigma: number, options: BlurWorkerOptions, method: Method): Promise<ImageData>;
