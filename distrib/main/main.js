import { asyncLoadImage, putImageIntoCanvas, putImageDataIntoCanvas, getImageDataFromCanvas } from '../dom/render_image.js';
import { asyncBlur, methodAdaptive, } from '../workers/blur.js';
import { orStop, StopHost } from '../workers/stop.js';
let srcFile = document.getElementById('srcFile');
let srcUrl = document.getElementById('srcUrl');
let urlButton = document.getElementById('urlButton');
let sigmaInput = document.getElementById('sigmaInput');
let poolSizeInput = document.getElementById('poolSizeInput');
let methodSelector = document.getElementById('methodSelector');
let resetButton = document.getElementById('resetButton');
let blurButton = document.getElementById('blurButton');
let progressSpan = document.getElementById('progressSpan');
let imageSize = document.getElementById('imageSize');
let srcImage = null;
let dstCanvas = document.getElementById('dstCanvas');
// global promise that stops rendering
let stopHost = new StopHost();
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
async function blurDstCanvas(stopPromise) {
    console.error('blur ready . . .');
    if (!srcImage || srcImage.width == 0 || srcImage.height == 0) {
        alert('no image to blur');
        return;
    }
    let sigma = parseFloat(sigmaInput.value);
    if (isNaN(sigma) || sigma < 0) {
        alert(`invalid sigma value ${sigma}`);
        return;
    }
    let poolSize = parseInt(poolSizeInput.value);
    if (isNaN(poolSize) || poolSize < 0) {
        poolSize = 0;
    }
    let method = methodSelector.value;
    if (method == '') {
        method = methodAdaptive;
    }
    try {
        // blurButton.disabled = true
        progressSpan.innerText = 'start blurring...';
        let perf0 = performance.now();
        let srcImageData = getImageDataFromCanvas(dstCanvas);
        let options = {
            poolSize: poolSize,
            progressFunc: (percent) => {
                progressSpan.innerText = `${percent} % of work done...`;
                putImageDataIntoCanvas(srcImageData, dstCanvas);
            },
            stopPromise: stopPromise
        };
        let dstImageData = await orStop(stopPromise, asyncBlur(srcImageData, sigma, options, method));
        putImageDataIntoCanvas(dstImageData, dstCanvas);
        let perf1 = performance.now();
        progressSpan.innerText = `blur complete in ${Math.round(perf1 - perf0)} ms`;
        console.error('blur done');
    }
    catch (e) {
        console.error('blur interrupted:', e);
        progressSpan.innerText = `blur interrupped: ${e}`;
    }
    finally {
        // blurButton.disabled = false
    }
}
srcFile.onchange = async () => {
    srcUrl.value = URL.createObjectURL(srcFile.files[0]);
    await stopHost.executeSimple(loadSourceImage).catch();
};
urlButton.onclick = async () => {
    await stopHost.executeSimple(loadSourceImage).catch();
};
resetButton.onclick = async () => {
    await stopHost.executeSimple(resetSourceImage).catch();
};
blurButton.onclick = async () => {
    await stopHost.executeStoppable(blurDstCanvas, false).catch();
};
