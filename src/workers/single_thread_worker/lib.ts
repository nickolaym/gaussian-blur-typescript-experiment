import { asyncBlurInplace, blurLine } from '../blur_lib.js'
import { newModuleWorker } from '../worker_lib.js'
import { BlurWorkerOptions } from '../options.js'
import { noStopPromise, orStop } from '../stop.js'

type WorkerRequest = {
    src: ImageData
    sigma: number
}

type WorkerResponse = {
    dst?: ImageData
    percent?: number
}

export async function asyncBlurImpl(
    imgdata: ImageData,
    sigma: number,
    options: BlurWorkerOptions,
): Promise<ImageData> {
    let worker = newModuleWorker(import.meta.resolve('./body.js'))
    try {
        imgdata = await orStop(options.stopPromise, new Promise<ImageData>(response => {
            worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
                if (event.data.percent) {
                    options.progressFunc(event.data.percent)
                }
                if (event.data.dst) {
                    response(event.data.dst)
                }
            }
            worker.postMessage({src: imgdata, sigma: sigma})
        }))
        return imgdata
    } catch (e) {
        console.warn('interrupted thread:', e)
        throw e
    } finally {
        console.log('terminate thread')
        worker.terminate()
    }
}

export function workerBody() {
    self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
        let imgdata = event.data.src
        let sigma = event.data.sigma
        let options: BlurWorkerOptions = {
            poolSize: 0,
            progressFunc: (percent: number) => {
                self.postMessage({percent: percent})
            },
            stopPromise: noStopPromise(),
        }
        await asyncBlurInplace(imgdata, sigma, blurLine, options)
        self.postMessage({dst: imgdata}, [imgdata.data.buffer])
    }
}
