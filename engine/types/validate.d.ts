import type { Definition, Limits } from "./Model"
export type { Limits } from "./Model"

const T = typeof ''
export type TypeOf = typeof T

export type TypeDef = NonNullable<Definition['type']> | 'array'