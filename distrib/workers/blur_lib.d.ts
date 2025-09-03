import { BlurWorkerOptions } from './options.js';
export type BlurCoeffs = Float32Array;
export declare function makeBlurCoeffs(sigma: number): BlurCoeffs;
type Pixel = number[];
export type PixelsArray = Uint8ClampedArray;
export declare class Pixels {
    readonly data: PixelsArray;
    constructor(data: PixelsArray);
    static create(n: number): Pixels;
    get length(): number;
    getPixel(i: number): Pixel;
    setPixel(i: number, pixel: Pixel): void;
}
export type BlurLineFunc = (src: Pixels, coeffs: BlurCoeffs) => (Pixels | Promise<Pixels>);
export declare function blurLine(src: Pixels, coeffs: BlurCoeffs): Pixels;
export declare function asyncBlurInplace(imgdata: ImageData, sigma: number, asyncBlurLineSomehow: BlurLineFunc, options: BlurWorkerOptions): Promise<void>;
export {};
