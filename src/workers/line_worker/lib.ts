import { Pixels, PixelsArray, BlurCoeffs, asyncBlurInplace, blurLine } from '../blur_lib.js'
import { newModuleWorker } from '../worker_lib.js'
import { BlurWorkerOptions } from '../options.js'
import { orStop } from '../stop.js'

type WorkerRequest = {
    src: PixelsArray
    coeffs: BlurCoeffs
}

type WorkerResponse = {
    dst: PixelsArray
}

export async function asyncBlurImpl(
    imgdata: ImageData,
    sigma: number,
    options: BlurWorkerOptions,
): Promise<ImageData> {
    let asyncBlurLine = async (src: Pixels, coeffs: BlurCoeffs) => {
        let worker = newModuleWorker(import.meta.resolve('./body.js'))
        try {
            return await orStop(options.stopPromise, new Promise<Pixels>(response => {
                worker.onmessage = (event: MessageEvent<WorkerResponse>) => response(new Pixels(event.data.dst))
                worker.postMessage({src: src.data, coeffs: coeffs}, [src.data.buffer])
            }))
        } catch (e) {
            console.warn('interrupted line worker:', e)
            throw e
        } finally {
            console.log('terminate line worker')
            worker.terminate()
        }
    }

    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options)
    return imgdata
}

export function workerBody() {
    self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
        let src = new Pixels(event.data.src)
        let coeffs = event.data.coeffs
        let dst = blurLine(src, coeffs)
        self.postMessage({dst: dst.data}, [dst.data.buffer])
    }
}
