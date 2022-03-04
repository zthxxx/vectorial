const { log, error } = console

// https://github.com/yjs/y-webrtc#logging
// localStorage.setItem('log', 'y-webrtc')

export const logger = {
  info: (...args: any[]) => log('[vectorial]', ...args),
  error: (...args: any[]) => error('[vectorial]', ...args),
}
