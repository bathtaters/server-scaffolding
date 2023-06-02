import { sqlTypes } from "./db"
import { htmlTypes } from "./gui"

/** Custom Class to use instead of a literal type string
 *   - DB Type is auto-generated from valueOf return type (Number defaults to INTEGER)
 *   - Retrieval from DB = new Type().set(dbValue: ReturnType<valueOf()>)
 *   - Input from HTML Form = new Type().parse(formValue: string)
 *   - Storage in DB = INSERT VALUE(this.valueOf())
 *   - toString() - used for displaying in HTML, defaults to String(this.valueOf())
 *   - toJSON() - used in JSON.stringify, defaults to this.valueOf() */
export abstract class ExtendedType<Raw extends string | number> {
    /** Create a new instance with the default value (Must allow 0 arguments) */
    constructor() {}
    /** Set from any value - Used in HTML Form getter (Throw error to reject form input) */
    abstract parse(value?: any): this
    /** Set to raw value - Used in DB Storage getter */
    abstract set(value: Raw): this
    /** Get raw value - Used in DB Storage */
    abstract valueOf(): Raw
    /** Get string value - Used in HTML View */
    toString() { return String(this.valueOf()) }
    /** Get value for JSON.stringify */
    toJSON()   { return this.valueOf() }
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