import { asyncLoadImage, putImageIntoCanvas, putImageDataIntoCanvas, getImageDataFromCanvas } from '../dom/render_image.js';
import { asyncBlur, methodAdaptive, } from '../workers/blur.js';
import { orStop, StopHost } from '../workers/stop.js';
let srcFile = document.getElementById('srcFile');
let srcUrl = document.getElementById('srcUrl');
let urlButton = document.getElementById('urlButton');
let sigmaInput = document.getElementById('sigmaInput');
let poolSizeInput = document.getElementById('poolSizeInput');
let crowdFactorInput = document.getElementById('crowdFactorInput');
let methodSelector = document.getElementById('methodSelector');
let resetButton = document.getElementById('resetButton');
let blurButton = document.getElementById('blurButton');
let progressSpan = document.getElementById('progressSpan');
let imageSize = document.getElementById('imageSize');
let srcImage = null;
let dstCanvas = document.getElementById('dstCanvas');
// global promise that stops rendering
let stopHost = new StopHost();
let scheduledBlurs = 0; // we can press "blur" button many times
async function resetSourceImage() {
    if (!srcImage)
        return;
    putImageIntoCanvas(srcImage, dstCanvas);
}
async function loadSourceImage() {
    let url = srcUrl.value;
    try {
        let img = await asyncLoadImage(url);
        srcImage = img;
        imageSize.innerText = `${img.width} x ${img.height}`;
        await resetSourceImage();
    }
    catch (error) {
        alert(error);
    }
}
function getBlurParams() {
    let sigma = parseFloat(sigmaInput.value);
    if (isNaN(sigma) || sigma <= 0) {
        throw new Error(`invalid sigma value ${sigmaInput.value} = ${sigma}`);
    }
    let poolSize = parseInt(poolSizeInput.value);
    if (isNaN(poolSize) || poolSize < 1) {
        throw new Error(`invalid pool size value ${poolSizeInput.value} = ${poolSize}`);
    }
    let crowdFactor = parseFloat(crowdFactorInput.value);
    if (isNaN(crowdFactor) || crowdFactor <= 0) {
        throw new Error(`invalid crowd factor value ${crowdFactorInput.value} = ${crowdFactor}`);
    }
    let crowdSize = Math.round(poolSize * crowdFactor);
    if (crowdSize < 1) {
        throw new Error(`too small crowd factor ${crowdFactor} * pool size ${poolSize} = ${crowdSize}`);
    }
    let method = methodSelector.value;
    if (method == '') {
        method = methodAdaptive;
    }
    return {
        sigma: sigma,
        poolSize: poolSize,
        crowdSize: crowdSize,
        method: method,
    };
}
async function blurDstCanvas(stopPromise, blurParams) {
    let setProgress = (progress) => {
        let progressSuffix = (scheduledBlurs == 1
            ? ''
            : ` and ${scheduledBlurs - 1} blurs not started yet`);
        progressSpan.innerText = progress + progressSuffix;
    };
    console.log('blur ready . . .');
    if (!srcImage || srcImage.width == 0 || srcImage.height == 0) {
        throw new Error('no image to blur');
    }
    try {
        setProgress('start blurring...');
        let perf0 = performance.now();
        let srcImageData = getImageDataFromCanvas(dstCanvas);
        let options = {
            poolSize: blurParams.poolSize,
            crowdSize: blurParams.crowdSize,
            progressFunc: (percent) => {
                setProgress(`${percent} % of work done...`);
                putImageDataIntoCanvas(srcImageData, dstCanvas);
            },
            stopPromise: stopPromise
        };
        let dstImageData = await orStop(stopPromise, asyncBlur(srcImageData, blurParams.sigma, options, blurParams.method));
        putImageDataIntoCanvas(dstImageData, dstCanvas);
        let perf1 = performance.now();
        setProgress(`blur complete in ${Math.round(perf1 - perf0)} ms`);
        console.log('blur done');
    }
    catch (e) {
        console.error('blur interrupted:', e);
        setProgress(`blur interrupped: ${e}`);
    }
}
srcFile.onchange = async () => {
    srcUrl.value = URL.createObjectURL(srcFile.files[0]);
    await stopHost.executeSimple(loadSourceImage);
};
urlButton.onclick = async () => {
    await stopHost.executeSimple(loadSourceImage);
};
resetButton.onclick = async () => {
    await stopHost.executeSimple(resetSourceImage);
};
blurButton.onclick = async () => {
    try {
        scheduledBlurs++;
        let params = getBlurParams();
        let task = async (stopPromise) => blurDstCanvas(stopPromise, params);
        await stopHost.executeStoppable(task, false);
    }
    catch (e) {
        alert(e);
    }
    finally {
        scheduledBlurs--;
    }
};
