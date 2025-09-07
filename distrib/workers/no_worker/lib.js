import { asyncBlurInplace, blurLine } from '../blur_lib.js';
import { orStop } from '../stop.js';
export async function asyncBlurImpl(imgdata, sigma, options) {
    let asyncBlurLine = async (src, coeffs) => {
        await orStop(options.stopPromise, new Promise(resolve => setTimeout(resolve)));
        return blurLine(src, coeffs);
    };
    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options);
    return imgdata;
}
