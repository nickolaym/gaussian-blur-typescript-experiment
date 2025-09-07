let moduleUrls = [
    './test_stoppable.js',
]

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

    let overall = 0
    let failures = 0

    async function runTest(name) {
        let test = module[name] as ()=>Promise<void>
        try {
            overall++
            console.warn('[TEST]    ', name)
            await test()
            console.warn('  [PASSED]', name)
        } catch {
            console.warn('  [FAILED]', name)
            failures++
        }
    }

    let testNames = Object.keys(module).filter(name => name.match(/test.*/))

    await sequenced(testNames, runTest)

    if (overall == 0) {
        console.warn('[TEST SUITE]', moduleUrl, 'has no tests')
    } else if (failures != 0) {
        console.error('[TEST SUITE FAILED]', moduleUrl, ':', failures, 'of', overall)
    } else {
        console.warn('[TEST SUITE PASSED]', moduleUrl, ':', overall)
    }

    return failures == 0
}

async function runAll() {
    let overall = 0
    let failures = 0
    await sequenced(moduleUrls,
        async (moduleUrl) => {
            console.warn('=========')
            overall++
            let ok = await runModule(moduleUrl)
            if (!ok) {
                failures++
            }
        }
    )
    if (failures == 0) {
        console.error('========', 'all tests passed', overall)
    } else {
        console.warn('=======', 'failed suites:', failures, 'of', overall)
        throw new Error('some tests failed')
    }
}

await runAll()
