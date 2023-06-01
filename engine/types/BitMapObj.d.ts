import type { BitMapStatic, BitMapBase, BitMapValue } from "./BitMap.d"
import type { KF_DELIM } from "../libs/BitMapObj"


/** Static BitMaObj members */
export interface BitMapObjStatic<Key extends string, Flag extends string, DefKey extends string> {
    /** Main Flag to Int map */
    readonly map:     BitMapStatic<Flag>['map']
    /** List of all object Keys (Except for the default key) */
    readonly keys:    Readonly<Key[]>
    /** Default key */
    readonly defKey:  DefKey
    /** List of all object Keys (Including the default key) */
    readonly allKeys: (Key | DefKey)[]
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
    new(): BitMapObjBase<Key, Flag, DefKey>
    new(bitmapObjStr?: string, defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag, DefKey>
    new(keyFlagArr?: string[], defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag, DefKey>
    new(keyNumObj?: BitMapObjValue<Key, Flag, DefKey>, defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag, DefKey>
    new(objOrArr?: BitMapObjValue<Key, Flag, DefKey> | string[] | string, defaultValue?: BitMapValue<BitMapBase<Flag>>): BitMapObjBase<Key, Flag, DefKey>
}


/** A Class representing set of on/off flags (flagList), mapped to binary positions */
export abstract class BitMapObjBase<Key extends string, Flag extends string, DefKey extends string> {
    /** Create a BitMapObject from an array of KeyFlags or an Object of numbers */
    constructor()
    constructor(bitmapObjStr?: string, defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(keyFlagArr?: string[], defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(keyNumObj?: BitMapObjValue<Key, Flag, DefKey>, defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(objOrArr?: BitMapObjValue<Key, Flag, DefKey> | string[] | string, defaultValue?: BitMapValue<BitMapBase<Flag>>)

    /** Main BitMapObject of form { Key: BitMapObj, ... default: BitMapObj } */
    abstract readonly obj: BitMapObject<Key, Flag, DefKey>

    /** Default key */
    abstract readonly defKey: DefKey

    /** Stringified BitMapObject of form { Key: BitMapObj, ... default: BitMapObj } */
    abstract value: string

    /** @returns the cooresponding BitMapObj for a Key OR the default BitMapObj if Key has no BitMapObj */
    abstract get(key: Key | DefKey): BitMapBase<Flag>

    /** Reset all BitMaps to reference the default, reset the default to the given value or zero 
     *  @returns Self */
    abstract reset(defaultValue?: BitMapValue<BitMapBase<Flag>>): this

    /** Parses any input and set BitMapObject to it.
     *  (Missing keys will become zero AKA all off)
     * @returns Self */
    abstract parse(value?: any): this

    /** Sets the BitMapObject to the specified result of toString().
     *  (Missing keys will become zero AKA all off)
     * @returns Self */
    abstract setString(bitmapValueStr: string): this

    /** Sets the BitMapObject to the specified key-flag array.
     *  (Missing keys will become zero AKA all off)
     * @returns Self */
    abstract setArray(keyFlagArr: string[]): this

    /** Sets the BitMapObject to the specified key:number object.
     *  (Missing keys will become zero AKA all off)
     * @returns Self */
    abstract setObject(bitmapValueObj: BitMapObjValue<Key, Flag, DefKey>): this

    /** Add specified flag(s) to every key (That is non-zero)
     * @returns Self */
    abstract addAll(value: BitMapValue<BitMapBase<Flag>>): this

    /** Remove specified flag(s) from every key
     * @returns Self */
    abstract removeAll(value: BitMapValue<BitMapBase<Flag>>): this

    /** Add specified flag(s) to specified keys
     * @returns Self */
    abstract addObject(valueObj: BitMapObjValue<Key, Flag, DefKey>): this

    /** Remove specified flag(s) from specified keys
     * @returns Self */
    abstract removeObject(valueObj: BitMapObjValue<Key, Flag, DefKey>): this

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

    /** Get object as a list of strings of form "key-flag" */
    abstract toArray(): string[]
}


/** Base object at the core of a BitMapObj */
export type BitMapObject<Key extends string, Flag extends string, DefKey extends string> =
    { [key in Key]: BitMapBase<Flag> } & { [key in DefKey]: BitMapBase<Flag> }

/** Constructor input value for BitMapObj from Keys & Flags */
export type BitMapObjValue<Key extends string, Flag extends string, DefKey extends string> =
    { [key in Key]+?: BitMapValue<BitMapBase<Flag>> } & { [key in DefKey]+?: BitMapValue<BitMapBase<Flag>> }

/** Extract base BitMap type from BitMapObj Class or Instance */
export type ExtractBitMap<BitMapObj extends BitMapObjBase<any,any,any> | BitMapObjStatic<any,any,any>> =
    BitMapObj extends BitMapObjStatic<any,any,any> ? ReturnType<BitMapObj['bitMap']> :
    BitMapObj extends BitMapObjBase<any,any,any>   ? BitMapObj['obj'][any] :
        never

/** Extract flags from BitMapObj Class or Instance */
export type ObjFlagType<BitMapObj extends BitMapObjBase<any,any,any> | BitMapObjStatic<any,any,any>> = 
    ExtractBitMap<BitMapObj>['list'][number]

/** Extract keys from BitMapObj Class or Instance */
export type ObjKeyType<BitMapObj extends BitMapObjBase<any,any,any> | BitMapObjStatic<any,any,any>> = 
    BitMapObj extends BitMapObjStatic<any,any,any> ? BitMapObj['keys'][number] :
    BitMapObj extends BitMapObjBase<any,any,any>   ? Exclude<keyof BitMapObj['obj'], ObjDefType<BitMapObj>> :
        never

/** Extract default key from BitMapObj Class or Instance */
export type ObjDefType<BitMapObj extends BitMapObjBase<any,any,any> | BitMapObjStatic<any,any,any>> = 
    BitMapObj['defKey']