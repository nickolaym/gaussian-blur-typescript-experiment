import { Pixels, PixelsArray, BlurCoeffs, asyncBlurInplace, blurLine } from '../blur_lib.js'
import { newModuleWorker } from '../worker_lib.js'
import { BlurWorkerOptions } from '../options.js'

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
    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options)
    return imgdata
}

async function asyncBlurLine(src: Pixels, coeffs: BlurCoeffs): Promise<Pixels> {
    let worker = newModuleWorker(import.meta.resolve('./body.js'))
    let dst = await new Promise<Pixels>(response => {
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => response(new Pixels(event.data.dst))
        worker.postMessage({src: src.data, coeffs: coeffs}, [src.data.buffer])
    })
    worker.terminate()
    return dst
}

export function workerBody() {
    self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
        let src = new Pixels(event.data.src)
        let coeffs = event.data.coeffs
        let dst = blurLine(src, coeffs)
        self.postMessage({dst: dst.data}, [dst.data.buffer])
    }
}
