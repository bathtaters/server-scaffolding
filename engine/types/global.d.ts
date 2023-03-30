// -- TYPESCRIPT HELPERS -- \\

export type ObjectOf<T, K extends string | number | symbol = string | number | symbol> = { [K in P]: T }

export type NestedObject<
    T extends ObjectOf<any, IK> = ObjectOf<any, IK>,
    OK extends string | number | symbol = string | number | symbol,
    IK extends string | number | symbol = string | number | symbol
> = ObjectOf<T, OK>

export type NestedObjectValue<O extends object, K extends keyof O[keyof O]> = Record<keyof O, O[keyof O][K]>

export type Recur<T, End = any> =
  T extends any[] ? Recur<T[number], End>[] :
  T extends object ? { [P in keyof T]: Recur<T[P], End> } :
    End

// -- TYPESCRIPT FIXES -- \\

export declare global {
    // Fix Object return types
    interface ObjectConstructor {
      keys<T>(o: T): T extends object ? (keyof T)[] :
        T extends number ? [] :
        T extends any[] ? number[] :
        T extends string ? string[] :
        never,
  
      fromEntries<K extends string|number|symbol, V>(entries: Array<[K, V]>): Record<K,V>,
    }
}
