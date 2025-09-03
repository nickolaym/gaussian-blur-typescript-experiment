import {
    Pixels,
    BlurCoeffs,
    BlurLineFunc,
    asyncBlurInplace,
    blurLine
} from '../blur_lib.js'
import { newModuleWorker } from '../worker_lib.js'
import { BlurWorkerOptions } from '../options.js'

type Tag = number

type WorkerRequestInit = {
    coeffs: BlurCoeffs
}

type WorkerRequest = {
    src: Pixels
    tag: Tag
}

type WorkerResponse = {
    dst: Pixels
    tag: Tag
}

export async function asyncBlurImpl(
    imgdata: ImageData,
    sigma: number,
    options: BlurWorkerOptions,
): Promise<ImageData> {
    const poolSize = (options.poolSize ? options.poolSize : 16)
    let workers = new Array<Worker>(poolSize)  // initially, unset
    let responses = new Map<Tag, (dst: Pixels)=>void>()
    let nextTag = 0

    type RequestFunc = (tag: Tag, src: Pixels, coeffs: BlurCoeffs) => Promise<Pixels>
    let requests = new Array<RequestFunc>(poolSize).fill(null)  // null instead of undefined to iterate over them
    requests.forEach((_, workerIndex) => {
        // first request sets the worker up
        requests[workerIndex] = async (tag: Tag, src: Pixels, coeffs: BlurCoeffs): Promise<Pixels> => {
            let worker = newModuleWorker(import.meta.resolve('./body.js'))
            workers[workerIndex] = worker
            worker.postMessage({coeffs: coeffs})  // this ping without pong

            // now we are ready to do regual requests
            // regular request is a ping-pong with corresponding worker
            let request = async (tag: Tag, src: Pixels, _: BlurCoeffs): Promise<Pixels> => {
                return await new Promise<Pixels>(response => {
                    responses.set(tag, response)
                    workers[workerIndex].postMessage({src: src, tag: tag})
                })
            }
            requests[workerIndex] = request
            worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
                let dst = event.data.dst
                let tag = event.data.tag
                responses.get(tag)!(dst)
                responses.delete(tag)
            }

            // so we do!
            return await request(tag, src, coeffs)
        }
    })

    let asyncBlurLine = async (src: Pixels, coeffs: BlurCoeffs): Promise<Pixels> => {
        let tag = nextTag++
        return await requests[tag % poolSize](tag, src, coeffs)
    }

    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options)

    workers.forEach(worker => worker.terminate())
    return imgdata
}

export function workerBody() {
    console.warn('pool worker body')
    self.onmessage = (event: MessageEvent<WorkerRequestInit>) => {
        console.warn('pool worker initialize')
        let coeffs = event.data.coeffs
        // no pong for this ping

        self.onmessage = (event: MessageEvent<WorkerRequest>) => {
            let src = event.data.src
            let tag = event.data.tag
            let dst = blurLine(src, coeffs)
            self.postMessage({dst: dst, tag: tag})
        }
    }
}
