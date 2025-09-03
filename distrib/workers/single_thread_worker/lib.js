import { asyncBlurInplace, blurLine } from '../blur_lib.js';
export async function asyncBlurImpl(imgdata, sigma, options) {
    // options.progressFunc(0)
    // let worker = newModuleWorker(import.meta.resolve('./body.js'))
    // imgdata = await new Promise<ImageData>(response => {
    //     worker.onmessage = (event: MessageEvent<WorkerResponse>) => response(event.data.dst)
    //     worker.postMessage({src: imgdata, sigma: sigma})
    // })
    // options.progressFunc(100)
    // worker.terminate()
    await asyncBlurInplace(imgdata, sigma, blurLine, options);
    return imgdata;
}
export function workerBody() {
    self.onmessage = async (event) => {
        let imgdata = event.data.src;
        let sigma = event.data.sigma;
        let options = {
            poolSize: 0,
            progressFunc: (percent) => { }
        };
        await asyncBlurInplace(imgdata, sigma, blurLine, options);
        self.postMessage({ dst: imgdata }, [imgdata.data.buffer]);
    };
}
