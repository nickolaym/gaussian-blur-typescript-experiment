import { OrStopFunc, StopError, Sequencer } from "../distrib/workers/sequencer.js"
import {assert, asyncPause, syncPause, makeTestCases } from './lib.js'

export let test = makeTestCases()

type TaskResult = {
    success: boolean
    started: number
    finished: number
}

type Stoppable = boolean
const kStoppable: Stoppable = true
const kNonstop  : Stoppable = false

type Interrupt = boolean
const kInterrupt: Interrupt = true
const kOrdinary : Interrupt = false

async function task(
    id: number,
    sequencer: Sequencer,
    stoppable: boolean,
    interrupt: boolean,
    duration: number,
): Promise<TaskResult> {
    let success = false
    let started = 0
    let finished = 0

    try {
        console.log('task', id, 'body launch...')
        let body = async (orStop: OrStopFunc) => {
            started = performance.now()
            console.log('task', id, 'body started at', started)
            if (stoppable) {
                await orStop(asyncPause(duration))
            } else {
                syncPause(duration)
            }
            finished = performance.now()
            console.log('task', id, 'body finished at', finished)
        }
        await sequencer.tryExecuteStoppable(body, interrupt)
        success = true
        console.log('task', id, 'success')
    } catch (e) {}

    return {success: success, started: started, finished: finished}
}

test('just launch', async() => {
    let sequencer = new Sequencer()
    let t1 = task(1, sequencer, kStoppable, kOrdinary, 10)
    await asyncPause()
    let r1 = await t1
    assert(r1.success)
})

test('strong sequence', async() => {
    let sequencer = new Sequencer()
    let t1 = task(1, sequencer, kStoppable, kOrdinary, 10)
    let t2 = task(2, sequencer, kStoppable, kOrdinary, 10)
    let t3 = task(3, sequencer, kStoppable, kOrdinary, 10)
    await asyncPause()
    let [r1, r2, r3] = await Promise.all([t1, t2, t3])
    assert(r1.success && r2.success && r3.success)
    assert(r1.finished < r2.started && r2.finished < r3.started)
})

test('interrupt stoppable', async() => {
    let sequencer = new Sequencer()
    let t1 = task(1, sequencer, kStoppable, kOrdinary, 10) // starts
    let t2 = task(2, sequencer, kNonstop,   kOrdinary, 10) // not managed to start, even being nonstop
    let t3 = task(3, sequencer, kStoppable, kInterrupt, 10) // interrupts all preceding
    let t4 = task(4, sequencer, kStoppable, kOrdinary, 10) // starts after 3
    await asyncPause()
    let [r1, r2, r3, r4] = await Promise.all([t1, t2, t3, t4])
    assert(!r1.success && !r2.success && r3.success && r4.success)
    assert(r1.started && !r1.finished && !r2.started)
    assert(r3.finished < r4.started)
})

test('interrupt nonstoppable ', async() => {
    let sequencer = new Sequencer()
    let t1 = task(1, sequencer, kNonstop,   kOrdinary, 10) // starts and finishes
    let t2 = task(2, sequencer, kStoppable, kOrdinary, 10) // not managed to start
    let t3 = task(3, sequencer, kStoppable, kInterrupt, 10) // interrupts all preceding
    let t4 = task(4, sequencer, kStoppable, kOrdinary, 10) // starts after 3
    await asyncPause()
    let [r1, r2, r3, r4] = await Promise.all([t1, t2, t3, t4])
    assert(r1.success && !r2.success && r3.success && r4.success)
    assert(r1.started && r1.finished && !r2.started)
    assert(r1.finished < r3.started && r3.finished < r4.started)
})

test('interrupt interruptors ', async() => {
    let sequencer = new Sequencer()
    let t1 = task(1, sequencer, kStoppable, kInterrupt, 10) // starts
    let t2 = task(2, sequencer, kStoppable, kInterrupt, 10) // starts
    let t3 = task(3, sequencer, kStoppable, kInterrupt, 10) // starts
    let t4 = task(4, sequencer, kStoppable, kInterrupt, 10) // starts and finishes
    await asyncPause()
    let [r1, r2, r3, r4] = await Promise.all([t1, t2, t3, t4])
    assert(!r1.success && !r2.success && !r3.success && r4.success)
    assert(r1.started && r1.started < r2.started && r2.started < r3.started && r3.started < r4.started)
    assert(!r1.finished && !r2.finished && !r3.finished)
})
