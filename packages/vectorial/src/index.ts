import paper from 'paper'

/**
 * make paper.js render-independent
 */
// @ts-expect-error
paper.setup()
// @ts-expect-error
paper.project.draw = () => {}


export * from './types'
export * from './anchor'
export * from './path'
export * from './shape'
export * from './math'
export * as math from './math'
export * from './mixin'
