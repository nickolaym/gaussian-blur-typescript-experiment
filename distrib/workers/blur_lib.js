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
function extrapolateSides(arr, count, radius) {
    let leftPixel = getPixel(arr, radius);
    let rightPixel = getPixel(arr, count + radius - 1);
    for (let t = 0; t != radius; ++t)
        setPixel(arr, t, leftPixel);
    for (let t = 0; t != radius; ++t)
        setPixel(arr, t + count + radius, rightPixel);
}
function getRowEx(imgdata, y, radius) {
    let bitmap = imgdata.data;
    let count = imgdata.width;
    let arr = makePixels(count + radius * 2);
    for (let x = 0; x != count; ++x) {
        setPixel(arr, x + radius, getPixel(bitmap, getOffset(imgdata, x, y)));
    }
    extrapolateSides(arr, count, radius);
    return arr;
}
function getColEx(imgdata, x, radius) {
    let bitmap = imgdata.data;
    let count = imgdata.height;
    let arr = makePixels(count + radius * 2);
    for (let y = 0; y != count; ++y) {
        setPixel(arr, y + radius, getPixel(bitmap, getOffset(imgdata, x, y)));
    }
    extrapolateSides(arr, count, radius);
    return arr;
}
function setRow(imgdata, y, arr) {
    let bitmap = imgdata.data;
    let count = imgdata.width;
    for (let x = 0; x != count; ++x) {
        setPixel(bitmap, getOffset(imgdata, x, y), getPixel(arr, x));
    }
}
function setCol(imgdata, x, arr) {
    let bitmap = imgdata.data;
    let count = imgdata.height;
    for (let y = 0; y != count; ++y) {
        setPixel(bitmap, getOffset(imgdata, x, y), getPixel(arr, y));
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
async function asyncBlurRowsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc) {
    let diameter = coeffs.length;
    let radius = (diameter - 1) / 2;
    let count = imgdata.height;
    let promises = new Array(count);
    for (let y = 0; y != count; ++y) {
        promises[y] = (async (yy) => {
            let srcline = getRowEx(imgdata, yy, radius);
            let dstline = await asyncBlurLineSomehow(srcline, coeffs);
            setRow(imgdata, yy, dstline);
            progressTickFunc();
        })(y);
    }
    await Promise.all(promises);
}
async function asyncBlurColsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc) {
    let diameter = coeffs.length;
    let radius = (diameter - 1) / 2;
    let count = imgdata.width;
    let promises = new Array(count);
    for (let x = 0; x != count; ++x) {
        promises[x] = (async (xx) => {
            let srcline = getColEx(imgdata, xx, radius);
            let dstline = await asyncBlurLineSomehow(srcline, coeffs);
            setCol(imgdata, xx, dstline);
            progressTickFunc();
        })(x);
    }
    await Promise.all(promises);
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
