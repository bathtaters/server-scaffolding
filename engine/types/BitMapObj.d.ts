import type { BitMapStatic, BitMapBase, BitMapValue } from "./BitMap.d"
import type { DEFAULT_KEY, KF_DELIM } from "../libs/BitMapObj"


/** Static BitMaObj members */
export interface BitMapObjStatic<Key extends string, Flag extends string> {
    /** Main Flag to Int map */
    readonly map:     BitMapStatic<Flag>['map']
    /** List of all object Keys (Except for the default key) */
    readonly keys:    Readonly<Key[]>
    /** List of all Flags/Values */
    readonly values:  BitMapStatic<Flag>['flags']
    /** Map of Flags to single-character representations */
    readonly charMap: BitMapStatic<Flag>['charMap']
    /** Total number of keys in this object (Minus the default key) */
    readonly count:   number
    
    /** Create a new related BitMapObj object */
    bitMap(value?: BitMapValue<BitMapBase<Flag>>): BitMapBase<Flag>

    /** Get mask for all values, except for the given value */
    mask(except?: BitMapValue<BitMapBase<Flag>>): number

    /** Tests if a string is a Key of this object */
    isKey(str: string): str is Key
    /** Tests if a string is a Flag/Value of this object */
    isValue: BitMapStatic<Flag>['isIn']
    /** Tests if a string is a KeyFlag string (Of the form "Key-Flag") */
    isKeyFlag(str: string): str is `${Key}${typeof KF_DELIM}${Flag}`

    /** Create a BitMapObject from an array of KeyFlags or an Object of numbers */
    new(): BitMapObjBase<Key, Flag>
    new(bitmapObjStr?: string, defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag>
    new(keyFlagArr?: string[], defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag>
    new(keyNumObj?: BitMapObjValue<Key, Flag>, defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag>
    new(objOrArr?: BitMapObjValue<Key, Flag> | string[] | string, defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag>
}


/** A Class representing set of on/off flags (flagList), mapped to binary positions */
export abstract class BitMapObjBase<Key extends string, Flag extends string> {
    /** Create a BitMapObject from an array of KeyFlags or an Object of numbers */
    constructor()
    constructor(bitmapObjStr?: string, defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(keyFlagArr?: string[], defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(keyNumObj?: BitMapObjValue<Key, Flag>, defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(objOrArr?: BitMapObjValue<Key, Flag> | string[] | string, defaultValue?: BitMapValue<BitMapBase<Flag>>)

    /** Main BitMapObject of form { Key: BitMapObj, ... default: BitMapObj } */
    abstract readonly obj: BitMapObject<Key, Flag>

    /** @returns the cooresponding BitMapObj for a Key OR the default BitMapObj if Key has no BitMapObj */
    abstract get(key: Key | typeof DEFAULT_KEY): BitMapBase<Flag>

    /** Reset all BitMaps to reference the default, reset the default to the given value or zero 
     *  @returns Self */
    abstract reset(defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag>

    /** Sets the BitMapObject to the specified key-flag array.
     *  (Missing keys will become zero AKA all off)
     * @returns Self */
    abstract setArray(keyFlagArr: string[]): BitMapObjBase<Key, Flag>

    /** Sets the BitMapObject to the specified key:number object.
     *  (Missing keys will become zero AKA all off)
     * @returns Self */
    abstract setObject(bitmapValueObj: BitMapObjValue<Key, Flag>): BitMapObjBase<Key, Flag>

    /** Add specified flag(s) to every key (That is non-zero)
     * @returns Self */
    abstract addAll(value: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag>

    /** Remove specified flag(s) from every key
     * @returns Self */
    abstract removeAll(value: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag>

    /** Add specified flag(s) to specified keys
     * @returns Self */
    abstract addObject(valueObj: BitMapObjValue<Key, Flag>): BitMapObjBase<Key, Flag>

    /** Remove specified flag(s) from specified keys
     * @returns Self */
    abstract removeObject(valueObj: BitMapObjValue<Key, Flag>): BitMapObjBase<Key, Flag>

    /** @returns A boolean indicating whether the key/default is a subset of the value. */
    abstract isSuperset(value?: BitMapValue<BitMapBase<Flag>>, key?: string): boolean
    /** @returns A boolean indicating whether the key/default is a superset of the value. */
    abstract isSubset(value?: BitMapValue<BitMapBase<Flag>>, key?: string): boolean
    /** @returns A boolean indicating whether the key/default intersects the value at all. */
    abstract intersects(value?: BitMapValue<BitMapBase<Flag>>, key?: string): boolean
    /** @returns A boolean indicating whether the key/default and value share no flags. */
    abstract isExclusive(value?: BitMapValue<BitMapBase<Flag>>, key?: string): boolean
    /** @returns A boolean indicating whether the key/default exactly equals the value. */
    abstract equals(value?: BitMapValue<BitMapBase<Flag>>, key?: string): boolean

    /** Get object as a comma-seperated list of "Key: Flag1/Flag2" or use characterMap for Flags */
    abstract toString(): string

    /** Get object as a JSON string of form { Key: number, ... default: number } */
    abstract toJSON(): BitMapObject<Key, Flag>

    /** Get object as a list of strings of form "key-flag" */
    abstract toArray(): string[]
}


/** Base object at the core of a BitMapObj */
export type BitMapObject<Key extends string, Flag extends string> =
    { [key in Key]: BitMapBase<Flag> } & { [DEFAULT_KEY]: BitMapBase<Flag> }

/** Constructor input value for BitMapObj from Keys & Flags */
export type BitMapObjValue<Key extends string, Flag extends string> =
    { [key in Key]+?: BitMapValue<BitMapBase<Flag>> } & { [DEFAULT_KEY]?: BitMapValue<BitMapBase<Flag>> }

/** Constructor input value for BitMapObj from Class or Instance */
export type BitMapObjToValue<BitMapObj extends BitMapObjBase<any,any> | BitMapObjStatic<any,any>> =
    BitMapObjValue<ObjKeyType<BitMapObj>, ObjFlagType<BitMapObj>>

/** Extract base object type from BitMapObj Class or Instance */
export type BitMapObjType<BitMapObj extends BitMapObjBase<any,any> | BitMapObjStatic<any,any>> = 
    BitMapObject<ObjKeyType<BitMapObj>, ObjFlagType<BitMapObj>>

export type ExtractBitMap<BitMapObj extends BitMapObjBase<any,any> | BitMapObjStatic<any,any>> =
    BitMapBase<ObjFlagType<BitMapObj>>

/** Extract flags from BitMapObj Class or Instance */
export type ObjFlagType<BitMapObj extends BitMapObjBase<any,any> | BitMapObjStatic<any,any>> = 
    BitMapObj extends BitMapObjStatic<any, any> ? BitMapObj['values'][number] :
    BitMapObj extends BitMapObjBase<any, any>   ? BitMapObj['obj'][typeof DEFAULT_KEY]['list'][number] :
        never

/** Extract keys from BitMapObj Class or Instance */
export type ObjKeyType<BitMapObj extends BitMapObjBase<any,any> | BitMapObjStatic<any,any>> = 
    BitMapObj extends BitMapObjStatic<any, any> ? BitMapObj['keys'][number] :
    BitMapObj extends BitMapObjBase<any, any>   ? Exclude<keyof BitMapObj['obj'], typeof DEFAULT_KEY> :
        never