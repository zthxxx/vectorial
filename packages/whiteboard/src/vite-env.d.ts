/// <reference types="vite/client" />


/**
 * due to fractional-indexing have no `types` field in package.json
 */
declare module 'fractional-indexing' {
  import * as fra from 'fractional-indexing/src/index.d'
  export = fra;
}
