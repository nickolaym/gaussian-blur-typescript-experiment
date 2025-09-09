async function sequenced(array, func) {
    // synchronous version of forEach()
    // can be expressed with reduce(), with accumulator Promise:
    // await array.reduce(async (p,v) => {await p; await func(v)}, Promise.resolve())
    for (let i in array) {
        await func(array[i]);
    }
}
async function runModule(moduleUrl) {
    console.warn('[TEST SUITE]', moduleUrl);
    let module = await import(moduleUrl);
    let overallCount = 0;
    let failures = new Array();
    async function runTest(name) {
        let test = module[name];
        try {
            overallCount++;
            console.warn('[TEST]    ', name);
            await test();
            console.warn('  [PASSED]', name);
        }
        catch {
            console.warn('  [FAILED]', name);
            failures.push(name);
        }
    }
    let testNames = Object.keys(module).filter(name => name.match(/test.*/));
    await sequenced(testNames, runTest);
    let ok = failures.length == 0;
    if (overallCount == 0) {
        console.warn('[TEST SUITE]', moduleUrl, 'has no tests');
    }
    else if (ok) {
        console.warn('[TEST SUITE PASSED]', moduleUrl, ':', overallCount);
    }
    else {
        console.error('[TEST SUITE FAILED]', moduleUrl, ':', failures.length, 'of', overallCount);
        failures.forEach(name => console.error('  [failed]', name));
    }
    return ok;
}
export async function runAllModules(moduleUrls) {
    let overallCount = 0;
    let failures = new Array();
    await sequenced(moduleUrls, async (moduleUrl) => {
        console.warn('=========');
        overallCount++;
        let ok = await runModule(moduleUrl);
        if (!ok) {
            failures.push(moduleUrl);
        }
    });
    let ok = failures.length == 0;
    if (overallCount == 0) {
        console.warn('========', 'no tests launched');
    }
    else if (ok) {
        console.warn('========', 'all tests passed:', overallCount);
    }
    else {
        console.error('=======', 'failed suites:', failures.length, 'of', overallCount);
        failures.forEach(moduleUrl => console.error('---', moduleUrl));
    }
    return ok;
}
export function exitProcess(ok) {
    process.exit(ok ? 0 : 1);
}
