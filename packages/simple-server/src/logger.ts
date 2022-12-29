const { log, error } = console

export const logger = {
  info: (...args: any[]) => log(`[${new Date().toISOString()}]`, ...args, '\n'),
  error: (...args: any[]) => error(`[${new Date().toISOString()}]`, ...args, '\n'),
}
