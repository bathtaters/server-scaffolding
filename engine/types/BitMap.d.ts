/** Static BitMap members */
export interface BitMapStatic<Flag extends string> {
    /** Main Flag to Int map */
    readonly map: Readonly<Record<Flag, BitMapBase<Flag>>>;

    /** List of all Flags */
    readonly flags: Readonly<Flag[]>;

    /** Integer mask to exclude non-BitMap bits */
    readonly mask: number;

    /** Map of Flags to single-character representations */
    readonly charMap?: CharMap<Flag>;

    /** Total number of flags in BitMap */
    readonly count: number;

    /** Total number of flags in BitMap */
    readonly byteLen: number;
    
    /** Test if string is a valid Flag */
    isIn(str: string): str is Flag;

    /** Create a BitMap from a number, flag, flag array or another BitMap (copy) */
    new(...values: BitMapValue<BitMapBase<Flag>>[]): any;
}


/** A Class representing set of on/off flags (flagList), mapped to binary positions */
export abstract class BitMapBase<Flag extends string> {
    /** Create a BitMap from a number, flag, flag array or another BitMap (copy) */
    constructor(...values: BitMapValue<BitMapBase<Flag>>[])

    /** Integer representation of BitMap */
    abstract int: number

    /** Binary representation of BitMap */
    abstract bin: string

    /** Hexadecimal representation of BitMap */
    abstract hex: string

    /** String of BitMap using CharacterMap (Returns undefined if CharacterMap is not defined) */
    abstract chars: string | undefined

    /** List of enabled flags */
    abstract list: Flag[]

    /** List of disabled flags */
    abstract inverse: Flag[]

    /** Count of number of enabled flags */
    abstract readonly count: number

    /** Sets the BitMap to the specified value.
     *  (No value will reset it to empty AKA 0)
     * @returns Self */
    abstract set(...values: BitMapValue<BitMapBase<Flag>>[]): BitMapBase<Flag>

    /** Appends the specified value(s) to the BitMap.
     * @returns Self */
    abstract add(...values: BitMapValue<BitMapBase<Flag>>[]): BitMapBase<Flag>

    /** Removes the specified value(s) from the BitMap.
     * @returns Self */
    abstract remove(...values: BitMapValue<BitMapBase<Flag>>[]): BitMapBase<Flag>

    /** @returns A boolean indicating whether this BitMap is a subset of the value. */
    abstract isSubset(...values: BitMapValue<BitMapBase<Flag>>[]): boolean 

    /** @returns A boolean indicating whether this BitMap is a superset of the value. */
    abstract isSuperset(...values: BitMapValue<BitMapBase<Flag>>[]): boolean 

    /** @returns A boolean indicating whether this BitMap intersects the value at all. */
    abstract intersects(...values: BitMapValue<BitMapBase<Flag>>[]): boolean 

    /** @returns A boolean indicating whether this BitMap and value share no flags. */
    abstract isExclusive(...values: BitMapValue<BitMapBase<Flag>>[]): boolean 

    /** @returns A boolean indicating whether this BitMap exactly equals the value. */
    abstract equals(...values: BitMapValue<BitMapBase<Flag>>[]): boolean 

    /** @returns Slash-seperated Flags or Characters from CharacterMap */
    abstract toString(): string

    /** @returns Value as a number for JSON encoding */
    abstract toJSON(): number
}


/** Map of flags to single-characters */
export type CharMap<Flag extends string> = Readonly<Record<Flag, string>>


/** Extract flags from BitMap Class or Instance */
export type FlagType<BitMap extends BitMapBase<any> | BitMapStatic<any>> = 
    BitMap extends BitMapStatic<infer F extends string> ? F :
    BitMap extends BitMapBase<infer F extends string>   ? F :
        never


/** Accepted input value for BitMap methods, from BitMap instance or Flags */
export type BitMapValue<BitMap extends BitMapBase<any> | BitMapStatic<any> | string> =
    BitMap | BitMap[] | number | undefined | (
        BitMap extends BitMapStatic<infer F extends string> ? F | F[] :
        BitMap extends BitMapBase<infer F extends string>   ? F | F[] :
            never)