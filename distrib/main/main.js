import { asyncLoadImage, putImageIntoCanvas, putImageDataIntoCanvas, getImageDataFromCanvas } from '../dom/render_image.js';
import { asyncBlur, methodAdaptive, } from '../workers/blur.js';
import { Sequencer } from '../workers/sequencer.js';
let srcFile = document.getElementById('srcFile');
let srcUrl = document.getElementById('srcUrl');
let urlButton = document.getElementById('urlButton');
let urlButtonPara = document.getElementById('urlButtonPara');
let urlButtonHeli = document.getElementById('urlButtonHeli');
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
let sequencer = new Sequencer();
let scheduledBlurs = 0; // we can press "blur" button many times
async function resetSourceImage() {
    if (!srcImage)
        return;
    putImageIntoCanvas(srcImage, dstCanvas);
}
async function loadGivenSourceImage(url) {
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
async function loadSourceImage() {
    await loadGivenSourceImage(srcUrl.value);
}
async function loadPresetSourceImage(url) {
    srcUrl.value = url;
    await loadGivenSourceImage(url);
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
async function blurDstCanvas(orStop, blurParams) {
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
            orStop: orStop,
        };
        let dstImageData = await orStop(asyncBlur(srcImageData, blurParams.sigma, options, blurParams.method));
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
    await sequencer.executeSimple(loadSourceImage);
};
urlButton.onclick = async () => {
    await sequencer.executeSimple(loadSourceImage);
};
urlButtonPara.onclick = async () => {
    await sequencer.executeSimple(async () => { loadPresetSourceImage('../images/bgd-cure-2.png'); });
};
urlButtonHeli.onclick = async () => {
    await sequencer.executeSimple(async () => { loadPresetSourceImage('../images/sky-crane.png'); });
};
resetButton.onclick = async () => {
    await sequencer.executeSimple(resetSourceImage);
};
blurButton.onclick = async () => {
    try {
        scheduledBlurs++;
        let params = getBlurParams();
        await sequencer.executeStoppable((orStop) => blurDstCanvas(orStop, params), false);
    }
    catch (e) {
        alert(e);
    }
    finally {
        scheduledBlurs--;
    }
};
