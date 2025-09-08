import { StopPromise } from './stop.js'

export type ProgressFunc = (percent: number) => void

export type BlurWorkerOptions = {
    poolSize: number  // int, >= 1
    crowdSize: number  // int, >= 1
    progressFunc: ProgressFunc
    stopPromise: StopPromise
}
