import paper from 'paper'

/**
 * make paper.js render-independent
 */
// @ts-ignore
paper.setup()
// @ts-ignore
paper.project.draw = () => {}


export * from './types'
export * from './anchor'
export * from './path'
export * from './shape'
export * from './math'
export * from './mixin'
