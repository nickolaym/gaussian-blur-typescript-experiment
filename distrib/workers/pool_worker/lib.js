import { Pixels, asyncBlurInplace, blurLine } from '../blur_lib.js';
import { newModuleWorker } from '../worker_lib.js';
export async function asyncBlurImpl(imgdata, sigma, options) {
    const poolSize = (options.poolSize ? options.poolSize : 16);
    let workers = new Array(poolSize); // initially, unset
    let responses = new Map();
    let nextTag = 0;
    let requests = new Array(poolSize).fill(null); // null instead of undefined to iterate over them
    requests.forEach((_, workerIndex) => {
        // first request sets the worker up
        requests[workerIndex] = async (tag, src, coeffs) => {
            let worker = newModuleWorker(import.meta.resolve('./body.js'));
            workers[workerIndex] = worker;
            worker.postMessage({ coeffs: coeffs }); // this ping without pong
            // now we are ready to do regual requests
            // regular request is a ping-pong with corresponding worker
            let request = async (tag, src, _) => {
                return await new Promise(response => {
                    responses.set(tag, response);
                    workers[workerIndex].postMessage({ src: src.data, tag: tag }, [src.data.buffer]);
                });
            };
            requests[workerIndex] = request;
            worker.onmessage = (event) => {
                let dst = new Pixels(event.data.dst);
                let tag = event.data.tag;
                responses.get(tag)(dst);
                responses.delete(tag);
            };
            // so we do!
            return await request(tag, src, coeffs);
        };
    });
    let asyncBlurLine = async (src, coeffs) => {
        let tag = nextTag++;
        return await requests[tag % poolSize](tag, src, coeffs);
    };
    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options);
    workers.forEach(worker => worker.terminate());
    return imgdata;
}
export function workerBody() {
    console.warn('pool worker body');
    self.onmessage = (event) => {
        console.warn('pool worker initialize');
        let coeffs = event.data.coeffs;
        // no pong for this ping
        self.onmessage = (event) => {
            let src = new Pixels(event.data.src);
            let tag = event.data.tag;
            let dst = blurLine(src, coeffs);
            self.postMessage({ dst: dst.data, tag: tag }, [dst.data.buffer]);
        };
    };
}
