import { TestCase, TestCases } from "./lib.js"

async function sequenced<T>(array: Array<T>, func: (arg: T) => Promise<void>) {
    // synchronous version of forEach()
    // can be expressed with reduce(), with accumulator Promise:
    // await array.reduce(async (p,v) => {await p; await func(v)}, Promise.resolve())

    for (let i in array) {
        await func(array[i])
    }
}

async function runModule(moduleUrl: string): Promise<boolean> {
    console.warn('[TEST SUITE]', moduleUrl)
    let module = await import(moduleUrl)

    let overallCount = 0
    let failures = new Array<string>()

    async function runTestCase(testcase: TestCase) {
        let {name, body} = testcase
        try {
            overallCount++
            console.warn('[TEST]    ', name)
            await body()
            console.warn('  [PASSED]', name)
        } catch {
            console.warn('  [FAILED]', name)
            failures.push(name)
        }
    }

    // ..... let test = module[name] as ()=>Promise<void> .....
    // let testNames = Object.keys(module).filter(name => name.match(/test.*/))
    // await sequenced(testNames, runTest)

    let testCases = module['test'] as TestCases
    if (testCases) {
        await sequenced(testCases.collection, runTestCase)
    }

    let ok = failures.length == 0
    if (overallCount == 0) {
        console.warn('[TEST SUITE]', moduleUrl, 'has no tests')
    } else if (ok) {
        console.warn('[TEST SUITE PASSED]', moduleUrl, ':', overallCount)
    } else {
        console.error('[TEST SUITE FAILED]', moduleUrl, ':', failures.length, 'of', overallCount)
        failures.forEach(name => console.error('  [failed]', name))
    }

    return ok
}

export async function runAllModules(moduleUrls: string[]): Promise<boolean> {
    let overallCount = 0
    let failures = new Array<string>()

    await sequenced(moduleUrls,
        async (moduleUrl) => {
            console.warn('=========')
            overallCount++
            let ok = await runModule(moduleUrl)
            if (!ok) {
                failures.push(moduleUrl)
            }
        }
    )

    let ok = failures.length == 0
    if (overallCount == 0) {
        console.warn('========', 'no tests launched')
    } else if (ok) {
        console.warn('========', 'all tests passed:', overallCount)
    } else {
        console.error('=======', 'failed suites:', failures.length, 'of', overallCount)
        failures.forEach(moduleUrl => console.error('---', moduleUrl))
    }

    return ok
}

export function exitProcess(ok: boolean) {
    process.exit(ok ? 0 : 1)
}
