import { asyncBlurInplace, blurLine } from '../blur_lib.js';
export async function asyncBlurImpl(imgdata, sigma, options) {
    let asyncBlurLine = async (src, coeffs) => {
        await options.orStop(new Promise(resolve => setTimeout(resolve)));
        return blurLine(src, coeffs);
    };
    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options);
    return imgdata;
}
