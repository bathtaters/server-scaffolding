import logger from './log'
import { hasDupes, invertObject } from '../utils/common.utils'

export type BitMapInput<Keys extends string> = BitMapValue<Keys> | Keys[] | Keys | number


/** Class representing a BitMap, from which to create values */
export default class BitMap<Name extends string> {
    private readonly _map
    private readonly _inverse
    private readonly _stringmap
    private readonly _invstring?: { [str: string]: Name }
    private readonly _max
    private readonly _zero
  
    private static hasDupes(array: any[]) { return hasDupes(array) }
    private static isOneBit(n: number) { return Math.log2(n) % 1 === 0 }
  
    constructor(bitmap: { [N in Name]: number }, stringmap?: { [N in Name]: string }) {
        const values = Object.values<number>(bitmap)

        if (BitMap.hasDupes(values))
            throw Error(`Bitmap has repeated values: ${JSON.stringify(bitmap)}`)
            
        if (!values.every((n) => BitMap.isOneBit(n)))
            throw Error(`Bitmap has non bit values: ${JSON.stringify(bitmap)}`)
            
        if (!values.includes(0))
            throw Error(`Bitmap must have '0' value: ${JSON.stringify(bitmap)}`)

        this._map = { ...bitmap }
        this._inverse = invertObject(this._map)
        

        this._stringmap = stringmap
        if (this._stringmap) this._invstring = invertObject(this._stringmap)

        this._zero = this._inverse[0 as keyof typeof this._inverse] as Name
        this._max = Object.values<number>(this._map).reduce<number>((sum,n) => sum | n, 0)
    }

    create(value?: BitMapInput<Name>) {
        return new BitMapValue(this, value)
    }

    fromString(str: string) {
        return new BitMapValue(this, this.stringToArray(str))
    }

    isValidString(str: string) {
        if (!this._stringmap) return false
        
        // Match each key, deleting them from the string as they are matched
        let substr = ''
        for (const key in this._stringmap) {
            const idx = str.indexOf(substr = this._stringmap[key])
            if (idx >= 0) str = `${str.slice(0, idx)}${str.slice(idx + substr.length)}`
        }
        return str.length === 0
    }

    stringToArray(str: string) {
        if (!this._stringmap) throw new Error('BitMap is missing associated StringMap')
        if (str === this._stringmap[this._zero]) return []

        let keys: Name[] = [],
            orig = str,
            substr = ''

        // Match each key, deleting them from the string as they are matched
        for (const key in this._stringmap) {
            const idx = str.indexOf(substr = this._stringmap[key])
            if (idx < 0) continue

            str = `${str.slice(0, idx)}${str.slice(idx + substr.length)}`
            keys.push(key)
        }

        if (str.length) throw new Error(`BitMap string "${orig}" contains un-mapped characters: ${str}`)
        return keys
    }
  
    get map()       { return this._map       }
    get inverse()   { return this._inverse   }
    get stringmap() { return this._stringmap }
    get invstring() { return this._invstring }
    get max()       { return this._max       }
    get zero()      { return this._zero      }
  
    get keys():   Name[]    { return Object.keys(this._map) as Name[] }
    get values(): number[]  { return Object.values(this._map) }
}




/** Class representing a BitMapped value */
export class BitMapValue<Name extends string> {
    private readonly _bitmap: BitMap<Name>
    private _set = new Set<Name>()
    
    constructor(bitmap: BitMap<Name>, fromValue?: BitMapInput<Name>) {
        this._bitmap = bitmap
        this.reset(fromValue)
    }

    /** @returns A boolean indicating whether the specified value is in this BitMap. */
    has(value: Name | number) {
        return typeof value === 'number' ? !!(this.int & value) : this._set.has(value)
    }

    /** @returns A boolean indicating whether this BitMap is a superset of the referenced BitMap. */
    isSubset(bitmap: BitMapValue<Name>): boolean {
        for (const val of this._set.values()) { if (!bitmap._set.has(val)) return false }
        return true
    }

    /** @returns A boolean indicating whether the BitMap is a subset of the referenced BitMap. */
    isSuperset(bitmap: BitMapValue<Name>): boolean {
        return bitmap.isSubset(this)
    }

    /** @returns A boolean indicating whether the BitMap intersects the referenced BitMap at all. */
    intersects(bitmap: BitMapValue<Name>) {
        for (const val of this._set.values()) { if (bitmap._set.has(val)) return true }
        return false
    }

    /** @returns A boolean indicating whether the BitMap exactly equals the referenced BitMap. */
    equals(bitmap: BitMapValue<Name>) {
        return this.int === bitmap.int
    }

    /** Appends the specified value(s) to the BitMap. */
    add(value: BitMapInput<Name>) {
        // Value is an instance of this class
        if (value instanceof BitMapValue) value = Array.from(value._set)
        // Value is an array of Names
        if (Array.isArray(value)) value.forEach((v) => this._set.add(v))
        // Value is a single Name
        else if (typeof value !== 'number') this._set.add(value)
        // Value is a number
        else for (const key in this._bitmap.map) {
            if (this._bitmap.map[key] & value) this._set.add(key)
        }
        return this
    }

    /** Removes the specified value(s) from the BitMap.
     * @returns Returns true if a value has been removed, or false if it did not exist.
     *          (If called with an array, response will be an array of booleans)
     */
    delete(value:  Name | number): boolean;
    delete(value: Name[] | BitMapValue<Name>): boolean[];
    delete(value: BitMapInput<Name>): boolean[] | boolean {
        // Value is an instance of this class
        if (value instanceof BitMapValue) value = Array.from(value._set)
        // Value is an array of Names
        if (Array.isArray(value))         return value.map((v) => this._set.delete(v))
        // Value is a single Name
        if (typeof value !== 'number')    return this._set.delete(value)
        // Value is a number
        let deleted = false
        for (const key in this._bitmap.map) {
            if (this._bitmap.map[key] & value) deleted ||= this._set.delete(key)
        }
        return deleted
    }

    /** Resets the BitMap to hold exactly the specified value(s) */
    reset(value?: BitMapInput<Name>) {
        // Value is undefined
        if      (!value)                       { this._set = new Set()           }
        // Value is an instance of this class  
        else if (value instanceof BitMapValue) { this._set = new Set(value._set) }
        // Value is an array of Names
        else if (Array.isArray(value))         { this._set = new Set(value)      }
        // Value is a single Name
        else if (typeof value !== 'number')    { this._set = new Set([value])    }
        // Value is a number
        else {
            this._set = new Set(this._bitmap.keys.filter((key) => this._bitmap.map[key] & value))
        }
    }

    

    /** Parent BitMap object */
    get bitmap() { return this._bitmap }
    
    /** Indicates if BitMap equals zero */
    get isZero() { return !this._set.size }

    /** List of enabled values in this BitMap */
    get values() {
        if (this.isZero) return [this._bitmap.zero]
        return this._bitmap.keys.filter(this._set.has)
    }

    /** Integer representing the binary value of this BitMap */
    get int() {
        return this.values.reduce((val, key) => val | this._bitmap.map[key], 0)
    }

    /** String concatenation of enable values in this BitMap (NOTE: Bitmap must have associated StringMap or this will throw) */
    get string() {
        if (!this._bitmap.stringmap) throw new Error('BitMap is missing associated StringMap')

        if (this.isZero) return this._bitmap.stringmap[this._bitmap.zero]
        return this.values.reduce(
            (str, key) => `${str}${this._bitmap.stringmap?.[key] ?? ''}`, ''
        ) || this._bitmap.stringmap[this._bitmap.zero]
    }

    // Set-able props
    set values(value) { this.reset(value) }
    set int(num)      { this.reset(num)   }
    set string(str)   { this.reset(this._bitmap.stringToArray(str)) }
}

