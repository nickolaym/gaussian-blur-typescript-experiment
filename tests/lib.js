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
