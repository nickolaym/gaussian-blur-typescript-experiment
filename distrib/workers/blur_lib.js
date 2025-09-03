const numSigmas = 3; // 3 sigma is precise enough
function sigmaToRadius(sigma) {
    return Math.ceil(sigma * numSigmas); // length of a shoulder (excluding THIS cell)
}
export function makeBlurCoeffs(sigma) {
    let radius = sigmaToRadius(sigma);
    let width = radius * 2 + 1; // array width
    let arr = new Float32Array(width);
    if (radius == 0) {
        arr[0] = 1;
        return arr;
    }
    // G(x) = 1/sqrt(2*pi*sigma2) * exp(-x2 / 2sigma2)
    // we shall normalize the array, so we are free not to set the constant factor
    let sigma2 = sigma * sigma;
    let sum = 0;
    arr.forEach((v, i) => {
        let x = i - radius;
        v = Math.exp(-x * x / sigma2);
        arr[i] = v;
        sum += v;
    });
    arr.forEach((v, i) => {
        arr[i] = v / sum;
    });
    return arr;
}
function makePixels(n) {
    return new Uint8ClampedArray(n * 4);
}
function countPixels(line) {
    let n = line.length;
    if (n % 4 != 0) {
        throw Error(`size of pixels ${n} is not multiple of 4`);
    }
    return n / 4;
}
function getPixel(arr, i) {
    let offset = i * 4;
    return [
        arr[offset + 0],
        arr[offset + 1],
        arr[offset + 2],
        arr[offset + 3],
    ];
}
function setPixel(arr, i, pixel) {
    let offset = i * 4;
    arr[offset + 0] = pixel[0];
    arr[offset + 1] = pixel[1];
    arr[offset + 2] = pixel[2];
    arr[offset + 3] = pixel[3];
}
function getOffset(imgdata, x, y) {
    return imgdata.width * y + x;
}
class BitmapBase {
    imgdata;
    constructor(imgdata) {
        this.imgdata = imgdata;
    }
    getPixel(lineIndex, pixelIndex) {
        return getPixel(this.imgdata.data, this.getOffset(lineIndex, pixelIndex));
    }
    setPixel(lineIndex, pixelIndex, pixel) {
        return setPixel(this.imgdata.data, this.getOffset(lineIndex, pixelIndex), pixel);
    }
}
class BitmapRows extends BitmapBase {
    get countLines() {
        return this.imgdata.height;
    }
    get countPixelsInLine() {
        return this.imgdata.width;
    }
    getOffset(lineIndex, pixelIndex) {
        return getOffset(this.imgdata, pixelIndex, lineIndex);
    }
}
class BitmapCols extends BitmapBase {
    get countLines() {
        return this.imgdata.width;
    }
    get countPixelsInLine() {
        return this.imgdata.height;
    }
    getOffset(lineIndex, pixelIndex) {
        return getOffset(this.imgdata, lineIndex, pixelIndex);
    }
}
function getLineEx(bitmap, lineIndex, radius) {
    let count = bitmap.countPixelsInLine;
    let line = makePixels(count + radius * 2);
    for (let pix = 0; pix != count; ++pix) {
        setPixel(line, pix + radius, bitmap.getPixel(lineIndex, pix));
    }
    let firstPixel = getPixel(line, 0);
    let lastPixel = getPixel(line, count + radius - 1);
    for (let pix = 0; pix != radius; ++pix) {
        setPixel(line, pix, firstPixel);
        setPixel(line, count + radius + pix, lastPixel);
    }
    return line;
}
function setLine(bitmap, lineIndex, line) {
    let count = bitmap.countPixelsInLine;
    for (let pix = 0; pix != count; ++pix) {
        bitmap.setPixel(lineIndex, pix, getPixel(line, pix));
    }
}
export function blurLine(src, coeffs) {
    let diameter = coeffs.length;
    let count = countPixels(src) - diameter + 1;
    let dst = makePixels(count);
    for (let i = 0; i != count; ++i) {
        let weightedPixel = [0, 0, 0, 0]; // float-point accumulators
        for (let j = 0; j != diameter; ++j) {
            let coeff = coeffs[j];
            let pixel = getPixel(src, i + j);
            weightedPixel[0] += pixel[0] * coeff;
            weightedPixel[1] += pixel[1] * coeff;
            weightedPixel[2] += pixel[2] * coeff;
            weightedPixel[3] += pixel[3] * coeff;
        }
        setPixel(dst, i, weightedPixel.map(Math.floor));
    }
    return dst;
}
async function asyncBlurLinesInplace(bitmap, coeffs, asyncBlurLineSomehow, progressTickFunc) {
    let diameter = coeffs.length;
    let radius = (diameter - 1) / 2;
    let count = bitmap.countLines;
    let promises = new Array(count).fill(null);
    promises.forEach((_, lineIndex) => {
        promises[lineIndex] = (async () => {
            let srcline = getLineEx(bitmap, lineIndex, radius);
            let dstline = await asyncBlurLineSomehow(srcline, coeffs);
            setLine(bitmap, lineIndex, dstline);
            progressTickFunc();
        })();
    });
    await Promise.all(promises);
}
async function asyncBlurRowsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc) {
    await asyncBlurLinesInplace(new BitmapRows(imgdata), coeffs, asyncBlurLineSomehow, progressTickFunc);
}
async function asyncBlurColsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc) {
    await asyncBlurLinesInplace(new BitmapCols(imgdata), coeffs, asyncBlurLineSomehow, progressTickFunc);
}
function makeProgressTickFunc(total, progressFunc) {
    let tick = 0;
    progressFunc(0);
    return () => {
        let prev = tick++;
        let prevPercent = Math.floor(prev * 100 / total);
        let percent = Math.floor(tick * 100 / total);
        if (prevPercent < percent) {
            progressFunc(percent);
        }
    };
}
export async function asyncBlurInplace(imgdata, sigma, asyncBlurLineSomehow, options) {
    let coeffs = makeBlurCoeffs(sigma);
    let progressTickFunc = makeProgressTickFunc(imgdata.width + imgdata.height, options.progressFunc);
    await asyncBlurColsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc);
    await asyncBlurRowsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc);
}
