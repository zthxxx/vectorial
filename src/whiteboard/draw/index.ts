import paper from 'paper'

/**
 * make paper.js render-independent
 */
// @ts-ignore
paper.setup()
// @ts-ignore
paper.project.draw = () => {}

export * from './anchor'
export * from './path'
