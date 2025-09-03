export function newModuleWorker(url: string): Worker {
    return new Worker(url, {type: 'module'})
}
