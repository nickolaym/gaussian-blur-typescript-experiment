export function newModuleWorker(url) {
    return new Worker(url, { type: 'module' });
}
