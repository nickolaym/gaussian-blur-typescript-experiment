import { asyncBlurInplace, blurLine } from '../blur_lib.js';
import { newModuleWorker } from '../worker_lib.js';
import { orStop } from '../stop.js';
export async function asyncBlurImpl(imgdata, sigma, options) {
    let worker = newModuleWorker(import.meta.resolve('./body.js'));
    try {
        options.progressFunc(0);
        imgdata = await orStop(options.stopPromise, new Promise(response => {
            worker.onmessage = (event) => response(event.data.dst);
            worker.postMessage({ src: imgdata, sigma: sigma });
        }));
        options.progressFunc(100);
        return imgdata;
    }
    catch (e) {
        console.warn('interrupted thread:', e);
        throw e;
    }
    finally {
        console.log('terminate thread');
        worker.terminate();
    }
}
export function workerBody() {
    self.onmessage = async (event) => {
        let imgdata = event.data.src;
        let sigma = event.data.sigma;
        let options = {
            poolSize: 0,
            progressFunc: (percent) => { },
            stopPromise: new Promise(_ => { }),
        };
        await asyncBlurInplace(imgdata, sigma, blurLine, options);
        self.postMessage({ dst: imgdata }, [imgdata.data.buffer]);
    };
}
