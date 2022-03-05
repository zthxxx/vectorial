/// <reference types="vite/client" />


/**
 * due to fractional-indexing have no `types` field in package.json
 */
declare module 'fractional-indexing' {
  import * as fra from 'fractional-indexing/src/index.d'
  export = fra;
}

declare module 'valtio' {
  export * from 'valtio/index.d'
  export function snapshot<T extends object>(p: T): T;
}

interface Array<T> {
  at(i: number): T | undefined;
}
