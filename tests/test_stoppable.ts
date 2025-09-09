import { OrStopFunc, StopError, StopHost } from "../distrib/workers/stop.js"
import {assert, asyncPause } from './lib.js'


class SideEffects {
    started: number = 0
    finished: number = 0
}

async function runTask(
    stopHost: StopHost,
    index: number,
    interrupt: boolean,
    sideEffects: SideEffects,
): Promise<boolean> {
    async function task(orStop: OrStopFunc) {
        console.log(`starting ${index}`)
        sideEffects.started = performance.now()
        for (let i = 0; i != 10; ++i) {
            await orStop(asyncPause())
            console.log(`passed ${index} step ${i}`)
        }
        console.log(`done ${index}`)
        sideEffects.finished = performance.now()
    }
    console.log(`launch ${index}`)
    try {
        await stopHost.tryExecuteStoppable(task, interrupt)
        return true
    } catch (e) {
        return false
    }
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

    let [d1, d2] = await Promise.all([t1, t2])

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

    let [d1, d2] = await Promise.all([t1, t2])

    assert(e1.started < e2.started, 'task1 should start before task2')
    assert(e1.finished == 0, 'task1 should not finish')
    assert(e2.finished != 0, 'task2 should finish')

    assert(!d1, 'task1 should fail (interrupt)')
    assert(d2, 'task1 should finish successfully')
}

export async function test_there_were_nothing_to_interrupt() {
    let stopHost = new StopHost()

    let t1 = runTask(stopHost, 1, true, new SideEffects())
    await asyncPause()
    let [d1] = await Promise.all([t1])
    assert(d1)
}

export async function test_intterrupt_all_previous_tasks() {
    let stopHost = new StopHost()

    let t1 = runTask(stopHost, 1, false, new SideEffects())
    let t2 = runTask(stopHost, 2, false, new SideEffects())
    let t3 = runTask(stopHost, 3, false, new SideEffects())
    await asyncPause()
    let t4 = runTask(stopHost, 4, true, new SideEffects())
    await asyncPause()
    let t5 = runTask(stopHost, 5, false, new SideEffects())

    let [d1, d2, d3, d4, d5] = await Promise.all([t1, t2, t3, t4, t5])
    assert(!d1 && !d2 && !d3 && d4 && d5)
}
