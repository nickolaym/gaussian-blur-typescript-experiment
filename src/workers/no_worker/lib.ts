import { asyncBlurInplace, BlurCoeffs, blurLine, Pixels } from '../blur_lib.js'
import { newModuleWorker } from '../worker_lib.js'
import { BlurWorkerOptions } from '../options.js'
import { noStopPromise, orStop } from '../stop.js'

export async function asyncBlurImpl(
    imgdata: ImageData,
    sigma: number,
    options: BlurWorkerOptions,
): Promise<ImageData> {
    let asyncBlurLine = async (src: Pixels, coeffs: BlurCoeffs) => {
        await orStop(options.stopPromise, new Promise(resolve => setTimeout(resolve)))
        return blurLine(src, coeffs)
    }
    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options)
    return imgdata
}
