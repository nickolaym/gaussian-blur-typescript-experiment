import { BlurWorkerOptions } from '../options.js';
export declare function asyncBlurImpl(imgdata: ImageData, sigma: number, options: BlurWorkerOptions): Promise<ImageData>;
export declare function workerBody(): void;
