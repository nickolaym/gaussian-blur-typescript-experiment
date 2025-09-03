export declare function asyncLoadImage(url: string): Promise<HTMLImageElement>;
type Canvas = OffscreenCanvas | HTMLCanvasElement;
export declare function putImageIntoCanvas(image: HTMLImageElement, canvas: Canvas): void;
export declare function putImageDataIntoCanvas(imgdata: ImageData, canvas: Canvas): void;
export declare function getImageDataFromCanvas(canvas: Canvas): ImageData;
export declare function renderImage(image: HTMLImageElement): ImageData;
export {};
