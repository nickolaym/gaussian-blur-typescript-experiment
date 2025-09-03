import { BlurWorkerOptions, ProgressFunc } from './options.js'

// Flat gaussian blur has a miracle feautre:
// it decomposes to a pair of linear blurs - by X then Y (or Y then X)
// So we will deal with linear blurs,
// because it is easy to implement and easy to parallelize

// Blur coefficients

export type BlurCoeffs = Float32Array

const numSigmas = 3  // 3 sigma is precise enough

function sigmaToRadius(sigma: number): number {
    return Math.ceil(sigma * numSigmas)  // length of a shoulder (excluding THIS cell)
}

export function makeBlurCoeffs(sigma: number): BlurCoeffs {
    let radius = sigmaToRadius(sigma)
    let width = radius * 2 + 1  // array width
    let arr = new Float32Array(width)

    if (radius == 0) {
        arr[0] = 1
        return arr
    }

    // G(x) = 1/sqrt(2*pi*sigma2) * exp(-x2 / 2sigma2)
    // we shall normalize the array, so we are free not to set the constant factor
    let sigma2 = sigma * sigma

    let sum = 0
    arr.forEach((v, i) => {
        let x = i - radius
        v = Math.exp(-x*x / sigma2)
        arr[i] = v
        sum += v
    })
    arr.forEach((v, i) => {
        arr[i] = v / sum
    })
    return arr
}

// A pixel is an array of 4 numbers in range 0..255, byte or float
type Pixel = number[]  // of size 4

// Pixels are a dense array, compatible with ImageData.data for uniform work
export type Pixels = Uint8ClampedArray

function makePixels(n: number): Pixels {
    return new Uint8ClampedArray(n * 4)
}
function countPixels(line: Pixels): number {
    let n = line.length
    if (n % 4 != 0) {
        throw Error(`size of pixels ${n} is not multiple of 4`)
    }
    return n / 4
}

function getPixel(arr: Pixels, i: number): Pixel {
    let offset = i * 4
    return [
        arr[offset + 0],
        arr[offset + 1],
        arr[offset + 2],
        arr[offset + 3],
    ]
}
function setPixel(arr: Pixels, i: number, pixel: Pixel): void {
    let offset = i * 4
    arr[offset + 0] = pixel[0]
    arr[offset + 1] = pixel[1]
    arr[offset + 2] = pixel[2]
    arr[offset + 3] = pixel[3]
}

function getOffset(imgdata: ImageData, x: number, y: number): number {
    return imgdata.width * y + x
}

interface BitmapView {
    get countLines(): number
    get countPixelsInLine(): number
    getOffset(lineIndex: number, pixelIndex: number): number
    getPixel(lineIndex: number, pixelIndex: number): Pixel
    setPixel(lineIndex: number, pixelIndex: number, pixel: Pixel): void
}

abstract class BitmapBase implements BitmapView {
    readonly imgdata: ImageData

    constructor(imgdata: ImageData) {
        this.imgdata = imgdata
    }

    abstract get countLines(): number
    abstract get countPixelsInLine(): number
    abstract getOffset(lineIndex: number, pixelIndex: number): number

    getPixel(lineIndex: number, pixelIndex: number): Pixel {
        return getPixel(this.imgdata.data, this.getOffset(lineIndex, pixelIndex))
    }
    setPixel(lineIndex: number, pixelIndex: number, pixel: Pixel): void {
        return setPixel(this.imgdata.data, this.getOffset(lineIndex, pixelIndex), pixel)
    }
}

class BitmapRows extends BitmapBase {
    get countLines(): number {
        return this.imgdata.height
    }
    get countPixelsInLine(): number {
        return this.imgdata.width
    }
    getOffset(lineIndex: number, pixelIndex: number): number {
        return getOffset(this.imgdata, pixelIndex, lineIndex)
    }
}

class BitmapCols extends BitmapBase {
    get countLines(): number {
        return this.imgdata.width
    }
    get countPixelsInLine(): number {
        return this.imgdata.height
    }
    getOffset(lineIndex: number, pixelIndex: number): number {
        return getOffset(this.imgdata, lineIndex, pixelIndex)
    }
}

function getLineEx(bitmap: BitmapView, lineIndex: number, radius: number): Pixels {
    let count = bitmap.countPixelsInLine
    let line = makePixels(count + radius * 2)
    for (let pix = 0; pix != count; ++pix) {
        setPixel(line, pix + radius, bitmap.getPixel(lineIndex, pix))
    }
    let firstPixel = getPixel(line, 0)
    let lastPixel = getPixel(line, count + radius -1)
    for (let pix = 0; pix != radius; ++pix) {
        setPixel(line, pix, firstPixel)
        setPixel(line, count + radius + pix, lastPixel)
    }
    return line
}

function setLine(bitmap: BitmapView, lineIndex: number, line: Pixels): void {
    let count = bitmap.countPixelsInLine
    for (let pix = 0; pix != count; ++pix) {
        bitmap.setPixel(lineIndex, pix, getPixel(line, pix))
    }
}

///////

export type BlurLineFunc = (src: Pixels, coeffs: BlurCoeffs) => (Pixels | Promise<Pixels>)

export function blurLine(src: Pixels, coeffs: BlurCoeffs): Pixels {
    let diameter = coeffs.length
    let count = countPixels(src) - diameter + 1
    let dst = makePixels(count)
    for (let i = 0; i != count; ++i) {
        let weightedPixel = [0, 0, 0, 0]  // float-point accumulators
        for (let j = 0; j != diameter; ++j) {
            let coeff = coeffs[j]
            let pixel = getPixel(src, i + j)
            weightedPixel[0] += pixel[0] * coeff
            weightedPixel[1] += pixel[1] * coeff
            weightedPixel[2] += pixel[2] * coeff
            weightedPixel[3] += pixel[3] * coeff
        }
        setPixel(dst, i, weightedPixel.map(Math.floor))
    }
    return dst
}

type ProgressTickFunc = () => void

async function asyncBlurLinesInplace(
    bitmap: BitmapView,
    coeffs: BlurCoeffs,
    asyncBlurLineSomehow: BlurLineFunc,
    progressTickFunc: ProgressTickFunc,
): Promise<void> {
    let diameter = coeffs.length
    let radius = (diameter - 1) / 2
    let count = bitmap.countLines

    let singleLineWork = async (lineIndex) => {
        let srcline = getLineEx(bitmap, lineIndex, radius)
        let dstline = await asyncBlurLineSomehow(srcline, coeffs)
        setLine(bitmap, lineIndex, dstline)
        progressTickFunc()
    }

    const countBatches = 100
    let countInBatch = Math.ceil(count / countBatches)
    let singleBatchWork = async (batchIndex) => {
        let batchLineBegin = batchIndex * countInBatch
        let batchLineEnd = batchLineBegin + countInBatch
        if (batchLineEnd > count) {
            batchLineEnd = count
        }

        // sequentially
        for (let lineIndex = batchLineBegin; lineIndex != batchLineEnd; ++lineIndex) {
            await singleLineWork(lineIndex)
        }
    }

    let promises = new Array<Promise<void>>(countBatches).fill(null)
    promises.forEach((_, batchIndex) => {
        promises[batchIndex] = singleBatchWork(batchIndex)
    })
    await Promise.all(promises)
}

async function asyncBlurRowsInplace(
    imgdata: ImageData,
    coeffs: BlurCoeffs,
    asyncBlurLineSomehow: BlurLineFunc,
    progressTickFunc: ProgressTickFunc,
): Promise<void> {
    await asyncBlurLinesInplace(new BitmapRows(imgdata), coeffs, asyncBlurLineSomehow, progressTickFunc)
}

async function asyncBlurColsInplace(
    imgdata: ImageData,
    coeffs: BlurCoeffs,
    asyncBlurLineSomehow: BlurLineFunc,
    progressTickFunc: ProgressTickFunc,
): Promise<void> {
    await asyncBlurLinesInplace(new BitmapCols(imgdata), coeffs, asyncBlurLineSomehow, progressTickFunc)
}

function makeProgressTickFunc(total: number, progressFunc: ProgressFunc) {
    let tick = 0
    progressFunc(0)
    return () => {
        let prev = tick++
        let prevPercent = Math.floor(prev * 100 / total)
        let percent = Math.floor(tick * 100 / total)
        if (prevPercent < percent) {
            progressFunc(percent)
        }
    }
}

export async function asyncBlurInplace(
    imgdata: ImageData,
    sigma: number,
    asyncBlurLineSomehow: BlurLineFunc,
    options: BlurWorkerOptions,
): Promise<void> {
    let coeffs = makeBlurCoeffs(sigma)

    let progressTickFunc = makeProgressTickFunc(imgdata.width + imgdata.height, options.progressFunc)

    await asyncBlurColsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc)
    await asyncBlurRowsInplace(imgdata, coeffs, asyncBlurLineSomehow, progressTickFunc)
}
