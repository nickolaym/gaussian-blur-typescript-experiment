import { asyncBlurInplace, blurLine } from '../blur_lib.js';
import { newModuleWorker } from '../worker_lib.js';
import { noStopPromise, orStop } from '../stop.js';
export async function asyncBlurImpl(imgdata, sigma, options) {
    let worker = newModuleWorker(import.meta.resolve('./body.js'));
    try {
        imgdata = await orStop(options.stopPromise, new Promise(response => {
            worker.onmessage = (event) => {
                if (event.data.percent) {
                    options.progressFunc(event.data.percent);
                }
                if (event.data.dst) {
                    response(event.data.dst);
                }
            };
            worker.postMessage({ src: imgdata, sigma: sigma });
        }));
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
            poolSize: 1,
            crowdSize: 1,
            progressFunc: (percent) => {
                self.postMessage({ percent: percent });
            },
            stopPromise: noStopPromise(),
        };
        await asyncBlurInplace(imgdata, sigma, blurLine, options);
        self.postMessage({ dst: imgdata }, [imgdata.data.buffer]);
    };
}
