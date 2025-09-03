import { asyncBlurInplace, blurLine } from '../blur_lib.js'
import { newModuleWorker } from '../worker_lib.js'
import { BlurWorkerOptions } from '../options.js'

type WorkerRequest = {
    src: ImageData
    sigma: number
}

type WorkerResponse = {
    dst: ImageData
}

export async function asyncBlurImpl(
    imgdata: ImageData,
    sigma: number,
    options: BlurWorkerOptions,
): Promise<ImageData> {
    options.progressFunc(0)
    let worker = newModuleWorker(import.meta.resolve('./body.js'))
    imgdata = await new Promise<ImageData>(response => {
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => response(event.data.dst)
        worker.postMessage({src: imgdata, sigma: sigma})
    })
    options.progressFunc(100)
    worker.terminate()
    return imgdata
}

export function workerBody() {
    self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
        let imgdata = event.data.src
        let sigma = event.data.sigma
        let options: BlurWorkerOptions = {
            poolSize: 0,
            progressFunc: (percent: number) => {}
        }
        await asyncBlurInplace(imgdata, sigma, blurLine, options)
        self.postMessage({dst: imgdata}, [imgdata.data.buffer])
    }
}
