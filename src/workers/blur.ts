import { asyncBlurImpl as asyncBlurWithWorkers } from './line_worker/lib.js'
import { asyncBlurImpl as asyncBlurWithPool } from './pool_worker/lib.js'
import { asyncBlurImpl as asyncBlurWithSingle } from './single_thread_worker/lib.js'

import { BlurWorkerOptions } from './options.js'

async function asyncBlurAdaptive(
    imgdata: ImageData,
    sigma: number,
    options: BlurWorkerOptions
): Promise<ImageData> {
    let width = imgdata.width
    let height = imgdata.height

    if (width == 1 || height == 1 || width * height <= 50 * 50) {
        return await asyncBlurWithSingle(imgdata, sigma, options)
    } else {
        return await asyncBlurWithPool(imgdata, sigma, options)
    }
}

export const methodSingle = 'single'
export const methodWorkers = 'workers'
export const methodPool = 'pool'
export const methodAdaptive = 'adaptive'

export type Method = 'single' | 'workers' | 'pool' | 'adaptive'

type AsyncBlurImplFunc = (imgdata: ImageData, sigma: number, options: BlurWorkerOptions) => Promise<ImageData>

const implTable = new Map<Method, AsyncBlurImplFunc>([
    [methodSingle, asyncBlurWithSingle],
    [methodWorkers, asyncBlurWithWorkers],
    [methodPool, asyncBlurWithPool],
    [methodAdaptive, asyncBlurAdaptive]
])

export async function asyncBlur(imgdata: ImageData, sigma: number, options: BlurWorkerOptions, method: Method): Promise<ImageData> {
    let impl = implTable.get(method)
    if (!impl) {
        throw new Error(`unexpected method ${method}`)
    }
    return impl(imgdata, sigma, options)
}
