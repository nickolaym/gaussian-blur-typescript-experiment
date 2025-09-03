import { asyncLoadImage, putImageIntoCanvas, putImageDataIntoCanvas, getImageDataFromCanvas } from '../dom/render_image.js';
import { asyncBlur, methodAdaptive, } from '../workers/blur.js';
let srcFile = document.getElementById('srcFile');
let srcUrl = document.getElementById('srcUrl');
let urlButton = document.getElementById('urlButton');
let sigmaInput = document.getElementById('sigmaInput');
let poolSizeInput = document.getElementById('poolSizeInput');
let methodSelector = document.getElementById('methodSelector');
let blurButton = document.getElementById('blurButton');
let progressSpan = document.getElementById('progressSpan');
let imageSize = document.getElementById('imageSize');
let srcCanvas = document.getElementById('srcCanvas');
let dstCanvas = document.getElementById('dstCanvas');
async function loadSourceImage() {
    let url = srcUrl.value;
    try {
        let img = await asyncLoadImage(url);
        imageSize.innerText = `${img.width} x ${img.height}`;
        putImageIntoCanvas(img, srcCanvas);
    }
    catch (error) {
        alert(error);
    }
}
srcFile.onchange = async () => {
    srcUrl.value = URL.createObjectURL(srcFile.files[0]);
    await loadSourceImage();
};
urlButton.onclick = async () => {
    await loadSourceImage();
};
blurButton.onclick = async () => {
    let sigma = parseFloat(sigmaInput.value);
    if (isNaN(sigma) || sigma < 0) {
        alert(`invalid sigma value ${sigma}`);
        return;
    }
    if (srcCanvas.width == 0 || srcCanvas.height == 0) {
        alert('no image to blur');
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
    progressSpan.innerText = 'start blurring...';
    let perf0 = performance.now();
    let srcImageData = getImageDataFromCanvas(srcCanvas);
    let options = {
        poolSize: poolSize,
        progressFunc: (percent) => {
            progressSpan.innerText = `${percent} % of work done...`;
            putImageDataIntoCanvas(srcImageData, dstCanvas);
        }
    };
    let dstImageData = await asyncBlur(srcImageData, sigma, options, method);
    putImageDataIntoCanvas(dstImageData, dstCanvas);
    let perf1 = performance.now();
    progressSpan.innerText = `blur complete in ${perf1 - perf0} ms`;
};
