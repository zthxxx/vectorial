const { log, error } = console

export const logger = {
  info: (...args: any[]) => log('[vectorial]', ...args),
  error: (...args: any[]) => error('[vectorial]', ...args),
}
