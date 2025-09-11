////////////////
// collect tests

// a module should export a variable 'test'
// export let test = makeTestCases()
// test('ahaha', ()=>{})
// test('ohoho', ()=>{})

export type TestFunc = () => (void | Promise<void>)
export type PrintParamFunc<T> = (param: T) => string
export type ParamTestFunc<T> = (param: T) => (void | Promise<void>)

export type TestCase = {
    name: string,
    body: TestFunc
}

export interface TestCases {
    (name: string, body: TestFunc): void
    parametrized<T>(name: string, params: T[], print: PrintParamFunc<T>, body: ParamTestFunc<T>): void
    collection:  Array<TestCase>
}

export function makeTestCases(): TestCases {
    let collection = new Array<TestCase>()

    function add(name: string, body: TestFunc) {
        collection.push({name: name, body: body})
    }

    function addParametrized<T>(
        name: string,
        params: T[],
        print: (param: T) => string,
        body: ParamTestFunc<T>,
    ) {
        params.forEach(param => add(`${name} [${print(param)}]`, () => body(param)))
    }

    add.collection = collection
    add.parametrized = addParametrized
    return add
}

//////////////
// assert

export class AssertionError extends Error {}

export function assert(condition: boolean, errorMessage: null | string | {():string} = null) {
    if (condition) {
        return
    }
    if (!errorMessage) {
        errorMessage = "assertion failed"
    } else if (typeof(errorMessage) != 'string') {
        errorMessage = errorMessage()
    }
    let error = new AssertionError(errorMessage)
    console.error(error)
    throw error
}

/////////////////
// some utilities

const quant = 1 // ms

export async function asyncPause(ms = quant) {
    await new Promise(r => setTimeout(r, ms))
}

export function syncPause(ms = quant) {
    let start = performance.now()
    let finish = start + ms

    let prev_dt = -1
    while (true) {
        let now = performance.now()
        let dt = now - start
        const print_every_ms = 1

        let dt1 = Math.floor(dt / print_every_ms)
        let dt0 = Math.floor(prev_dt / print_every_ms)
        if (dt1 > dt0) {
            console.log('syncPause', dt, 'of', ms)
        }
        prev_dt = dt

        if (now >= finish) {
            return
        }
    }
}
