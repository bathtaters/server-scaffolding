// -- TYPESCRIPT HELPERS -- \\

/** Flatten type definitions for Intellisense tooltips (Works well with Generic types) */
export type Flatten<T> = T extends any ? { [K in keyof T as T[K] extends never ? never : K] : T[K] } : never

/** Returns union of Type and Promise of Type */
export type Awaitable<T> = Promise<T> | T

/** Object of a single type value (Inverse of Record<>) */
export type ObjectOf<T, K extends string | number | symbol = string | number | symbol> = { [P in K]: T }


/** Object of nested objects <T>, OK = outermost key type, IK = inner object <T> key type */
export type NestedObject<InnerObject extends Record<keyof any, any>, OuterKey extends keyof any> = Record<OuterKey, InnerObject>


/** An object derived from a nested object using the outer objects' keys and selected props from the inner objects
 *   - Example: O = { a: { i: 1 }, b: { i: 2 } }, K = "i", DerivedObject = { a: 1, b: 2 } */
export type NestedObjectValue<O extends object, K extends keyof O[keyof O]> = Record<keyof O, O[keyof O][K]>


/** A recursive array or object, recurs itself until End is not an array or object
 *   - Emulates the return value from function called recursively on elements of an array/object */
export type Recur<T, End = any> =
  T extends any[] ? Recur<T[number], End>[] :
  T extends object ? { [P in keyof T]: Recur<T[P], End> } :
    End


/** Require EXACTLY ONE of the given Keys */
export type ExactlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, never>>
  }[Keys]

/** Require AT MOST ONE of the given Keys */
export type OneOrNone<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
      [K in Keys]-?: Partial<Pick<T, K> & Record<Exclude<Keys, K>, never>>
  }[Keys]

/** Require AT LEAST ONE of the given Keys */
export type OneOrMore<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]


/** Add properties from type S to T, make any properties only on type S optional. */
export type AddAsPartial<T, S> = T & Partial<Omit<S, keyof T>>


/** Convet from a Type into a string of that type */
export type TypeOf<T = any> =
  (T extends boolean   ? "boolean"   : never) |
  (T extends string    ? "string"    : never) |
  (T extends number    ? "number"    : never) |
  (T extends bigint    ? "bigint"    : never) |
  (T extends symbol    ? "symbol"    : never) |
  (T extends object    ? "object"    : never) |
  (T extends Function  ? "function"  : never) |
  (T extends undefined ? "undefined" : never) |
    never


/** Convert from 'typeof' operator result string to type */
export type TypeStr<T extends string> =
  T extends "boolean"   ? boolean   :
  T extends "string"    ? string    :
  T extends "number"    ? number    :
  T extends "bigint"    ? bigint    :
  T extends "symbol"    ? symbol    :
  T extends "object"    ? object    :
  T extends "function"  ? Function  :
  T extends "undefined" ? undefined :
    any


// TODO -- add ts-reset
