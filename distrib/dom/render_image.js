//
// load and render source image
//
export async function asyncLoadImage(url) {
    return new Promise((resolve, reject) => {
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
    });
}
export function putImageIntoCanvas(image, canvas) {
    canvas.width = image.width;
    canvas.height = image.height;
    let context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
}
export function putImageDataIntoCanvas(imgdata, canvas) {
    canvas.width = imgdata.width;
    canvas.height = imgdata.height;
    let context = canvas.getContext('2d');
    context.putImageData(imgdata, 0, 0);
}
export function getImageDataFromCanvas(canvas) {
    let context = canvas.getContext('2d');
    return context.getImageData(0, 0, canvas.width, canvas.height);
}
export function renderImage(image) {
    let canvas = new OffscreenCanvas(image.width, image.height);
    putImageIntoCanvas(image, canvas);
    return getImageDataFromCanvas(canvas);
}
