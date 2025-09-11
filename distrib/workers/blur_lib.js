const numSigmas = 3; // 3 sigma is precise enough
export function sigmaToRadius(sigma) {
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
export class Pixels {
    data;
    constructor(data) {
        if (data.length % 4 != 0) {
            throw new Error(`broken array of quadruplets of size ${data.length}`);
        }
        this.data = data;
    }
    static create(n) {
        return new Pixels(new Uint8ClampedArray(n * 4));
    }
    get length() { return this.data.length / 4; }
    getPixel(i) {
        let offset = i * 4;
        return [
            this.data[offset + 0],
            this.data[offset + 1],
            this.data[offset + 2],
            this.data[offset + 3],
        ];
    }
    setPixel(i, pixel) {
        let offset = i * 4;
        this.data[offset + 0] = pixel[0];
        this.data[offset + 1] = pixel[1];
        this.data[offset + 2] = pixel[2];
        this.data[offset + 3] = pixel[3];
    }
}
function getOffset(imgdata, x, y) {
    return imgdata.width * y + x;
}
class BitmapBase {
    imgdata;
    pixels;
    constructor(imgdata) {
        this.imgdata = imgdata;
        this.pixels = new Pixels(imgdata.data);
    }
    getPixel(lineIndex, pixelIndex) {
        return this.pixels.getPixel(this.getOffset(lineIndex, pixelIndex));
    }
    setPixel(lineIndex, pixelIndex, pixel) {
        return this.pixels.setPixel(this.getOffset(lineIndex, pixelIndex), pixel);
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
    let line = Pixels.create(count + radius * 2);
    for (let pix = 0; pix != count; ++pix) {
        line.setPixel(pix + radius, bitmap.getPixel(lineIndex, pix));
    }
    let firstPixel = line.getPixel(radius);
    let lastPixel = line.getPixel(count + radius - 1);
    for (let pix = 0; pix != radius; ++pix) {
        line.setPixel(pix, firstPixel);
        line.setPixel(count + radius + pix, lastPixel);
    }
    return line;
}
function setLine(bitmap, lineIndex, line) {
    let count = bitmap.countPixelsInLine;
    for (let pix = 0; pix != count; ++pix) {
        bitmap.setPixel(lineIndex, pix, line.getPixel(pix));
    }
}
export function blurLine(src, coeffs) {
    let diameter = coeffs.length;
    let count = src.length - diameter + 1;
    let dst = Pixels.create(count);
    for (let i = 0; i != count; ++i) {
        let weightedPixel = [0, 0, 0, 0]; // float-point accumulators
        for (let j = 0; j != diameter; ++j) {
            let coeff = coeffs[j];
            let pixel = src.getPixel(i + j);
            weightedPixel[0] += pixel[0] * coeff;
            weightedPixel[1] += pixel[1] * coeff;
            weightedPixel[2] += pixel[2] * coeff;
            weightedPixel[3] += pixel[3] * coeff;
        }
        dst.setPixel(i, weightedPixel.map(Math.floor));
    }
    return dst;
}
async function asyncBlurLinesInplace(bitmap, coeffs, asyncBlurLineSomehow, options, progressTickFunc) {
    let diameter = coeffs.length;
    let radius = (diameter - 1) / 2;
    let count = bitmap.countLines;
    let singleLineWork = async (lineIndex) => {
        let srcline = getLineEx(bitmap, lineIndex, radius);
        let dstline = await asyncBlurLineSomehow(srcline, coeffs);
        setLine(bitmap, lineIndex, dstline);
        progressTickFunc();
    };
    // if countBatches is greater than number of threads,
    // we will put data into message queues
    // Huge difference overfills queues, subtle difference makes threads waiting
    const countThreads = options.poolSize;
    const countBatches = options.crowdSize;
    let countInBatch = Math.ceil(count / countBatches);
    let singleBatchWork = async (batchIndex) => {
        let batchLineBegin = batchIndex * countInBatch;
        if (batchLineBegin > count) {
            return;
        }
        let batchLineEnd = batchLineBegin + countInBatch;
        if (batchLineEnd > count) {
            batchLineEnd = count;
        }
        // sequentially
        for (let lineIndex = batchLineBegin; lineIndex != batchLineEnd; ++lineIndex) {
            await singleLineWork(lineIndex);
        }
    };
    let promises = new Array(countBatches).fill(null);
    promises.forEach((_, batchIndex) => {
        promises[batchIndex] = singleBatchWork(batchIndex);
    });
    await Promise.all(promises);
}
async function asyncBlurRowsInplace(imgdata, coeffs, asyncBlurLineSomehow, options, progressTickFunc) {
    await asyncBlurLinesInplace(new BitmapRows(imgdata), coeffs, asyncBlurLineSomehow, options, progressTickFunc);
}
async function asyncBlurColsInplace(imgdata, coeffs, asyncBlurLineSomehow, options, progressTickFunc) {
    await asyncBlurLinesInplace(new BitmapCols(imgdata), coeffs, asyncBlurLineSomehow, options, progressTickFunc);
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
    if (options.crowdSize < 1 || options.poolSize < 1) {
        throw new Error('incorrect options');
    }
    let coeffs = makeBlurCoeffs(sigma);
    let progressTickFunc = makeProgressTickFunc(imgdata.width + imgdata.height, options.progressFunc);
    await asyncBlurColsInplace(imgdata, coeffs, asyncBlurLineSomehow, options, progressTickFunc);
    await asyncBlurRowsInplace(imgdata, coeffs, asyncBlurLineSomehow, options, progressTickFunc);
}
