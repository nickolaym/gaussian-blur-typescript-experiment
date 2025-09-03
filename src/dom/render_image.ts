//
// load and render source image
//

export async function asyncLoadImage(url: string): Promise<HTMLImageElement> {
    return new Promise(
        (resolve, reject) => {
            let image = new Image()
            image.crossOrigin = 'anonymous'
            image.onload = () => resolve(image)
            image.onerror = reject
            image.src = url
        },
    )
}

type Canvas = OffscreenCanvas | HTMLCanvasElement

export function putImageIntoCanvas(image: HTMLImageElement, canvas: Canvas) {
    canvas.width = image.width
    canvas.height = image.height
    let context = canvas.getContext('2d')! as CanvasDrawImage
    context.drawImage(image, 0, 0)
}

export function putImageDataIntoCanvas(imgdata: ImageData, canvas: Canvas) {
    canvas.width = imgdata.width
    canvas.height = imgdata.height
    let context = canvas.getContext('2d')! as CanvasImageData
    context.putImageData(imgdata, 0, 0)
}

export function getImageDataFromCanvas(canvas: Canvas) {
    let context = canvas.getContext('2d')! as CanvasImageData
    return context.getImageData(0, 0, canvas.width, canvas.height)
}

export function renderImage(image: HTMLImageElement): ImageData {
    let canvas = new OffscreenCanvas(image.width, image.height)
    putImageIntoCanvas(image, canvas)
    return getImageDataFromCanvas(canvas)
}
