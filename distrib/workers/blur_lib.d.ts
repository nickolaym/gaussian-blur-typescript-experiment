import { BlurWorkerOptions } from './options.js';
export type BlurCoeffs = Float32Array;
export declare function makeBlurCoeffs(sigma: number): BlurCoeffs;
export type Pixels = Uint8ClampedArray;
export type BlurLineFunc = (src: Pixels, coeffs: BlurCoeffs) => (Pixels | Promise<Pixels>);
export declare function blurLine(src: Pixels, coeffs: BlurCoeffs): Pixels;
export declare function asyncBlurInplace(imgdata: ImageData, sigma: number, asyncBlurLineSomehow: BlurLineFunc, options: BlurWorkerOptions): Promise<void>;
