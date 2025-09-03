import { Pixels, asyncBlurInplace, blurLine } from '../blur_lib.js';
import { newModuleWorker } from '../worker_lib.js';
export async function asyncBlurImpl(imgdata, sigma, options) {
    await asyncBlurInplace(imgdata, sigma, asyncBlurLine, options);
    return imgdata;
}
async function asyncBlurLine(src, coeffs) {
    let worker = newModuleWorker(import.meta.resolve('./body.js'));
    let dst = await new Promise(response => {
        worker.onmessage = (event) => response(new Pixels(event.data.dst));
        worker.postMessage({ src: src.data, coeffs: coeffs }, [src.data.buffer]);
    });
    worker.terminate();
    return dst;
}
export function workerBody() {
    self.onmessage = async (event) => {
        let src = new Pixels(event.data.src);
        let coeffs = event.data.coeffs;
        let dst = blurLine(src, coeffs);
        self.postMessage({ dst: dst.data }, [dst.data.buffer]);
    };
}
