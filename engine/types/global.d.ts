// -- TYPESCRIPT HELPERS -- \\

/** Object of a single type value (Inverse of Record<>) */
export type ObjectOf<T, K extends string | number | symbol = string | number | symbol> = { [K in P]: T }


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


/** An object that requires AT LEAST ONE of the Keys */
export type RequireOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

/** Add properties from type S to T, make any properties only on type S optional. */
export type AddAsPartial<T, S> = T & Partial<Omit<S, keyof T>>

    
// -- TYPESCRIPT FIXES -- \\

// TODO -- add ts-reset
