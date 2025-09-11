////////////////
// collect tests
export function makeTestCases() {
    let collection = new Array();
    function add(name, body) {
        collection.push({ name: name, body: body });
    }
    add.collection = collection;
    return add;
}
//////////////
// assert
export class AssertionError extends Error {
}
export function assert(condition, errorMessage = null) {
    if (condition) {
        return;
    }
    if (!errorMessage) {
        errorMessage = "assertion failed";
    }
    else if (typeof (errorMessage) != 'string') {
        errorMessage = errorMessage();
    }
    let error = new AssertionError(errorMessage);
    console.error(error);
    throw error;
}
/////////////////
// some utilities
const quant = 1; // ms
export async function asyncPause(ms = quant) {
    await new Promise(r => setTimeout(r, ms));
}
export function syncPause(ms = quant) {
    let start = performance.now();
    let finish = start + ms;
    let prev_dt = -1;
    while (true) {
        let now = performance.now();
        let dt = now - start;
        const print_every_ms = 1;
        let dt1 = Math.floor(dt / print_every_ms);
        let dt0 = Math.floor(prev_dt / print_every_ms);
        if (dt1 > dt0) {
            console.log('syncPause', dt, 'of', ms, '::', dt1, dt0);
        }
        prev_dt = dt;
        if (now >= finish) {
            return;
        }
    }
}
