import {
    asyncLoadImage,
    putImageIntoCanvas,
    putImageDataIntoCanvas,
    getImageDataFromCanvas
} from '../dom/render_image.js'

import {
    asyncBlur,
    methodAdaptive,
    Method,
} from '../workers/blur.js'

import { orStop, StopHost } from '../workers/stop.js'

let srcFile = document.getElementById('srcFile') as HTMLInputElement

let srcUrl = document.getElementById('srcUrl') as HTMLInputElement
let urlButton = document.getElementById('urlButton') as HTMLButtonElement

let sigmaInput = document.getElementById('sigmaInput') as HTMLInputElement
let poolSizeInput = document.getElementById('poolSizeInput') as HTMLInputElement
let methodSelector = document.getElementById('methodSelector') as HTMLSelectElement

let resetButton = document.getElementById('resetButton') as HTMLButtonElement
let blurButton = document.getElementById('blurButton') as HTMLButtonElement
let progressSpan = document.getElementById('progressSpan') as HTMLSpanElement

let imageSize = document.getElementById('imageSize') as HTMLSpanElement

let srcImage: HTMLImageElement = null
let dstCanvas = document.getElementById('dstCanvas') as HTMLCanvasElement

// global promise that stops rendering

let stopHost = new StopHost()

async function loadSourceImage() {
    let url = srcUrl.value
    try {
        await stopHost.stop()
        let img = await asyncLoadImage(url)
        srcImage = img
        imageSize.innerText = `${img.width} x ${img.height}`
        putImageIntoCanvas(img, dstCanvas)
    } catch (error) {
        alert(error)
    }
}

srcFile.onchange = async () => {
    srcUrl.value = URL.createObjectURL(srcFile.files[0])
    await loadSourceImage()
}

urlButton.onclick = async () => {
    await loadSourceImage()
}

resetButton.onclick = async () => {
    await stopHost.stop()
    if (!srcImage) return
    putImageIntoCanvas(srcImage, dstCanvas)
}

blurButton.onclick = async () => {
    await stopHost.stop()

    console.error('blur ready . . .')
    if (!srcImage || srcImage.width == 0 || srcImage.height == 0) {
        alert('no image to blur')
        return
    }

    let sigma = parseFloat(sigmaInput.value)
    if (isNaN(sigma) || sigma < 0) {
        alert(`invalid sigma value ${sigma}`)
        return
    }
    let poolSize = parseInt(poolSizeInput.value)
    if (isNaN(poolSize) || poolSize < 0) {
        poolSize = 0
    }
    let method = methodSelector.value
    if (method == '') {
        method = methodAdaptive
    }

    try {
        blurButton.disabled = true

        let stopObject = stopHost.newStopObject()

        progressSpan.innerText = 'start blurring...'
        let perf0 = performance.now()
        let srcImageData = getImageDataFromCanvas(dstCanvas)
        let options = {
            poolSize: poolSize,
            progressFunc: (percent: number) => {
                progressSpan.innerText = `${percent} % of work done...`
                putImageDataIntoCanvas(srcImageData, dstCanvas)
            },
            stopPromise: stopObject.stopPromise
        }
        let dstImageData = await orStop(options.stopPromise,
            asyncBlur(srcImageData, sigma, options, method as Method))
        putImageDataIntoCanvas(dstImageData, dstCanvas)
        let perf1 = performance.now()
        progressSpan.innerText = `blur complete in ${Math.round(perf1 - perf0)} ms`
        console.error('blur done')
    } catch (e) {
        console.error('blur interrupted:', e)
        progressSpan.innerText = `blur interrupped: ${e}`
    } finally {
        stopHost.done()
        blurButton.disabled = false
    }
}
