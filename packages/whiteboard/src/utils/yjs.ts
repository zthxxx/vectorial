import * as Y from 'yjs'

export type SharedTypes<T> = (
  T extends Function
    ? never
    : (
      T extends Y.Doc | Y.AbstractType<any>
        ? T
        : (
          T extends Array<any>
            ? Y.Array<SharedTypes<T[number]>>
            : (
              T extends object
                ? YMap<{ [K in keyof T]: SharedTypes<T[K]>}>
                : T
            )
        )
    )
)

export type SerializeType<T> = (
  T extends Function
    ? never
    : (
      T extends Y.Doc
        ? never
        : (
          T extends Y.Array<infer U>
          ? Array<SerializeType<U>>
          : (
            T extends YMap<infer U>
              ? { [K in keyof U]: SerializeType<U[K]> }
              : T extends object
                ? { [K in keyof T]: SerializeType<T[K]> }
                : T
          )
        )
    )
)

export type SharedArray<T extends Array<any>> = Y.Array<SharedTypes<T[number]>>
export type SharedMap<T extends object> = YMap<{ [K in keyof T]: SharedTypes<T[K]>}>

export interface YMap<T extends object> extends Y.Map<any> {
  get: {
    <K extends keyof T>(key: K): T[K] | undefined
    (key: never): any
  }

  set: {
    <K extends keyof T>(key: K, value: T[K]): T[K]
    (key: never, value: any): any
  }

  forEach: {
    <K extends keyof T>(callback: (value: T[K], key: K, map: YMap<T>) => void): never
    (f: (value: any, key: never, map: any) => void): never
  }

  clone: () => YMap<T>

  toJSON: () => SerializeType<T>
}

export interface YDoc<T extends object> extends Y.Doc {
  getMap: {
    <K>(name: string): Y.Map<K>
    (): YMap<{ [K in keyof T]: SharedTypes<T[K]>}>
  }
}

type YMapType = new <T extends object>(...args: ConstructorParameters<typeof Y.Map>) => YMap<T>
type TDocType = new <T extends object>(...args: ConstructorParameters<typeof Y.Doc>) => YDoc<T>

export const YMap: YMapType = Y.Map as YMapType
export const YDoc: TDocType = Y.Doc as TDocType


export const toSharedTypes = <T>(value: T): SharedTypes<T> => {
  switch (true) {
    case (typeof value === 'function'):
    case (value instanceof Y.Doc): {
      throw new Error(`yjs SharedTypes need JSON-encodable values, but got function ${value}`)
    }
    case (value instanceof Y.AbstractType): {
      // @ts-ignore
      return value
    }
    case (value instanceof Array):
    case (value instanceof Set): {
      // @ts-ignore
      return Y.Array.from<SharedTypes<T[number]>>([...value].map(toSharedTypes))
    }
    case (value instanceof Map): {
      // @ts-ignore
      return new YMap([...value.entries()].map(([k, v]) => [k, toSharedTypes(v)]))
    }
    case (value instanceof Object): {
      // @ts-ignore
      return new YMap(Object.entries(value).map(([k, v]) => [k, toSharedTypes(v)]))
    }
    default: {
      // @ts-ignore
      return value
    }
  }
}

export const assignMap = (yMap: Y.Map<any>, obj: object) => {
  Object.entries(obj).forEach(([key, value]) => {
    yMap.set(key, toSharedTypes(value))
  })
}
