import { orStop, StopHost, StopPromise } from "../distrib/workers/stop.js"
import {assert, asyncPause } from './lib.js'


class SideEffects {
    started: number = 0
    finished: number = 0
}

// returns whether the task completed successfully
async function run(task: Promise<void>): Promise<boolean> {
    try {
        await task
        console.log('run succeeded')
        return true
    } catch (e) {
        console.log(`run failed: ${e}`)
        return false
    }
}

async function runAll(tasks: Promise<void>[]): Promise<boolean[]> {
    return Promise.all(tasks.map(run))
}

async function runTask(
    stopHost: StopHost,
    index: number,
    interrupt: boolean,
    sideEffects: SideEffects,
) {
    async function task(stopPromise: StopPromise) {
        console.log(`starting ${index}`)
        sideEffects.started = performance.now()
        for (let i = 0; i != 10; ++i) {
            await orStop(stopPromise, asyncPause())
            console.log(`passed ${index} step ${i}`)
        }
        console.log(`done ${index}`)
        sideEffects.finished = performance.now()
    }
    console.log(`launch ${index}`)
    await stopHost.tryExecuteStoppable(task, interrupt)
}

export async function test_task1_completes_before_task2() {
    let stopHost = new StopHost()

    let e1 = new SideEffects()
    let t1 = runTask(stopHost, 1, false, e1)

    assert(e1.started != 0, 'task1 should start')
    await asyncPause()
    assert(!e1.finished, 'task1 should not finish yet')

    let e2 = new SideEffects()
    let t2 = runTask(stopHost, 2, false, e2)

    assert(e2.started == 0, 'task2 should not start before task1 finished')

    let [d1, d2] = await runAll([t1, t2])

    assert(e1.started < e2.started, 'task1 should start before task2')
    assert(e1.finished != 0, 'task1 should finish')
    assert(e2.finished != 0, 'task2 should finish')
    assert(e1.finished <= e2.started, 'task1 should finish before task2 start')

    assert(d1, 'task1 should finish successfully')
    assert(d2, 'task1 should finish successfully')
}

export async function test_task1_interrupts_before_task2() {
    let stopHost = new StopHost()

    let e1 = new SideEffects()
    let t1 = runTask(stopHost, 1, false, e1)

    assert(e1.started != 0, 'task1 should start')
    await asyncPause()
    assert(!e1.finished, 'task1 should not finish yet')

    let e2 = new SideEffects()
    let t2 = runTask(stopHost, 2, true, e2)

    assert(e2.started == 0, 'task2 should not start before task1 finished')

    let [d1, d2] = await runAll([t1, t2])

    assert(e1.started < e2.started, 'task1 should start before task2')
    assert(e1.finished == 0, 'task1 should not finish')
    assert(e2.finished != 0, 'task2 should finish')

    assert(!d1, 'task1 should fail (interrupt)')
    assert(d2, 'task1 should finish successfully')
}
