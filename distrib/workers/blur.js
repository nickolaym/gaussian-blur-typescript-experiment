import { asyncBlurImpl as asyncBlurWithWorkers } from './line_worker/lib.js';
import { asyncBlurImpl as asyncBlurWithPool } from './pool_worker/lib.js';
import { asyncBlurImpl as asyncBlurWithSingle } from './single_thread_worker/lib.js';
import { asyncBlurImpl as asyncBlurNoWorker } from './no_worker/lib.js';
async function asyncBlurAdaptive(imgdata, sigma, options) {
    let width = imgdata.width;
    let height = imgdata.height;
    if (width == 1 || height == 1 || width * height <= 50 * 50) {
        return await asyncBlurWithSingle(imgdata, sigma, options);
    }
    else {
        return await asyncBlurWithPool(imgdata, sigma, options);
    }
}
export const methodSingle = 'single';
export const methodWorkers = 'workers';
export const methodPool = 'pool';
export const methodAdaptive = 'adaptive';
export const methodNoWorker = 'noworker';
const implTable = new Map([
    [methodSingle, asyncBlurWithSingle],
    [methodWorkers, asyncBlurWithWorkers],
    [methodPool, asyncBlurWithPool],
    [methodAdaptive, asyncBlurAdaptive],
    [methodNoWorker, asyncBlurNoWorker],
]);
export async function asyncBlur(imgdata, sigma, options, method) {
    let impl = implTable.get(method);
    if (!impl) {
        throw new Error(`unexpected method ${method}`);
    }
    return impl(imgdata, sigma, options);
}
