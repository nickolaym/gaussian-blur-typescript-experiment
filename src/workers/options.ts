export type ProgressFunc = (percent: number) => void

export type BlurWorkerOptions = {
    poolSize: number
    progressFunc: ProgressFunc
    stopPromise: Promise<void>
}
