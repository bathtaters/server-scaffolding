import { sqlTypes } from "./db"
import { htmlTypes } from "./gui"

/** Custom Class to use over a builtin type */
export abstract class ExtendedType<Raw extends string | number> {
    /** Raw value: this should be set to a default value */
    abstract value: Raw
    /** Create a new instance with the default value (Must allow 0 arguments) */
    constructor() {}
    /** Set from any value - Used in HTML Form getter (Throw error to reject form input) */
    abstract parse(value?: any): this
    /** Set to raw value - Used in DB Storage getter */
    set(value: Raw) { this.value = value; return this }
    /** Get raw value - Used in DB Storage */
    valueOf()  { return this.value }
    /** Get string value - Used in HTML View */
    toString() { return String(this.valueOf()) }
    /** Get value for JSON.stringify */
    toJSON()   { return this.value }
}

export const extendedTypeDefaults = { db: sqlTypes.Text, html: htmlTypes.text } as const

export const viewMetaKey = '_meta'

export const childLabel = { foreignId: 'fid', index: 'idx', value: 'val' } as const
export const childIndexType = 'int'

export const adapterTypes = {
    fromDB: 'fromDbAdapter',
    toDB:     'toDbAdapter',
    fromUI: 'fromUiAdapter',
    toUI:     'toUiAdapter',
} as const

export const extendedAdapters /*: Record<typeof adapterTypes[keyof typeof adapterTypes], keyof ExtendedType<any>>*/ = {
    [adapterTypes.fromDB]: 'set',
    [adapterTypes.toDB]:   'valueOf',
    [adapterTypes.fromUI]: 'parse',
    [adapterTypes.toUI]:   'toString',
} as const