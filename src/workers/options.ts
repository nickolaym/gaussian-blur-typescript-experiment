import { OrStopFunc } from './sequencer.js'

export type ProgressFunc = (percent: number) => void

export type BlurWorkerOptions = {
    poolSize: number  // int, >= 1
    crowdSize: number  // int, >= 1
    progressFunc: ProgressFunc
    orStop: OrStopFunc
}
