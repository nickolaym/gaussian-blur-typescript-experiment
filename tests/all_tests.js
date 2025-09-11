import { exitProcess, runAllModules } from "./all_tests_lib.js";
exitProcess(await runAllModules([
    './test_stoppable.js',
    './test_blur.js',
]));
