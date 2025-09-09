import { asyncBlurInplace, BlurCoeffs, blurLine, Pixels } from '../blur_lib.js'
import { BlurWorkerOptions } from '../options.js'

export async function asyncBlurImpl(
    imgdata: ImageData,
    sigma: number,
    options: BlurWorkerOptions,
): Promise<ImageData> {
    let asyncBlurLine = async (src: Pixels, coeffs: BlurCoeffs) => {
        await options.orStop(new Promise(resolve => setTimeout(resolve)))
        return blurLine(src, coeffs)
    }
    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options)
    return imgdata
}
