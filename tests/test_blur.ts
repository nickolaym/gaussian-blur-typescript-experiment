import {makeBlurCoeffs, sigmaToRadius} from '../distrib/workers/blur_lib.js'
import {assert, makeTestCases } from './lib.js'

export let test = makeTestCases()

test.parametrized('sigma to radius',
    [
        {sigma:0, radius:0},
        {sigma:0.1, radius:1},
        {sigma:0.3, radius:1},
        {sigma:0.4, radius:2},
        {sigma:1, radius:3},
        {sigma:10, radius:30},
    ],
    (param) => `sigma = ${param.sigma}`,
    (param) => { assert(sigmaToRadius(param.sigma) == param.radius) }
)

test.parametrized('make coeffs',
    [0, 0.1, 0.3, 1, 10, 100], // sigma
    (sigma) => `sigma = ${sigma}`,
    (sigma) => {
        let radius = sigmaToRadius(sigma)
        let coeffs = makeBlurCoeffs(sigma)
        assert(coeffs.length == 1 + radius * 2)
        coeffs.forEach((v, i) => assert(v == coeffs[coeffs.length - 1 - i]))
        // assert(coeffs.reduce((s, v) => s + v) == 1)
        let s = coeffs.reduce((s, v) => s + v, 0);
        assert(Math.trunc(Math.abs(s - 1)) < 1e-7)
    }
)
