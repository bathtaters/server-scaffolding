import type { BitMapBase, BitMapStatic, BitMapValue, CharMap } from "../types/BitMap.d"
import { mapObject } from "../utils/common.utils"

const MAX_LENGTH = 32, STR_DELIM = '/'


export default function BitMapFactory<Flag extends string>(flagList: readonly Flag[], emptyFlag?: Flag, characterMap?: CharMap<Flag>) {
    if (flagList.length <          1) throw new Error(`BitMap flagList must have at least 1 flag.`)
    if (flagList.length > MAX_LENGTH) throw new Error(`BitMap flagList must be shorter than ${MAX_LENGTH} flags: length is ${flagList.length}.`)
    if (characterMap && Object.values<string>(characterMap).some((c) => c.length !== 1))
        throw new Error(`BitMap characterMap must contain single-character values only: ${JSON.stringify(characterMap)}`)

    /** Represents a set of on/off flags mapped to binary positions */
    class BitMap implements BitMapBase<Flag> {
        //  **** STATIC **** \\
        private static readonly _flags  = [ ...flagList ] as const
        private static readonly _mask   = (1 << this._flags.length) - 1
        private static readonly _char   = characterMap
        private static readonly _intmap = toIntMap(this._flags)
        private static readonly _empty  = emptyFlag
        private static          _map?: BitMapStatic<Flag>['map']

        /** Main Flag to Int map */
        static get map():       BitMapStatic<Flag>['map']     { return this._map ?? (this._map = toMap(this._intmap, this)) }
        /** List of Flags (Excluding emptyFlag) */
        static get flags():     BitMapStatic<Flag>['flags']   { return this._flags }
        /** List of empty flag only (or empty list if no empty flag) */
        static get emptyList(): BitMapStatic<Flag>['emptyList'] { return this._empty ? [this._empty] : [] }
        /** Integer mask to exclude non-BitMap bits */
        static get mask():      BitMapStatic<Flag>['mask']    { return this._mask  }
        /** Map of Flags to single-character representations */
        static get charMap():   BitMapStatic<Flag>['charMap'] { return this._char  }
        /** Total number of flags in BitMap */
        static get count():     BitMapStatic<Flag>['count']   { return this.flags.length }
        /** Total number of flags in BitMap */
        static get byteLen():   BitMapStatic<Flag>['byteLen'] { return Math.ceil(this.count / 8) }
        
        /** Test if string is a valid Flag */
        static isIn(str: string): str is Flag { return str in this._intmap }

        /** Construct from String representation (ignoreCharMap will interpret strings as full Flag names even if a charMap is present) */
        static fromString(str: string | string[], ignoreCharMap = false) {
            return new this(ignoreCharMap || !this.charMap ? this._fromString(str) : this._fromChars(str))
        }
        /** Construct from JSON representation */
        static fromJSON(json: string)  {
            if (isNaN(+json)) throw new Error(`Invalid number while parsing BitMap: ${json}`)
            return new this(+json)
        }

        //  **** INSTANCE **** \\
        private _value = 0
        
        constructor(...values: BitMapValue<BitMapBase<Flag>>[]) { this.set(...values) }

        set int(value) { this._value = value & BitMap.mask }
        get int()      { return this._value }

        set bin(value) { this.int = parseInt(value, 2) }
        get bin()      { return this.int.toString(2).padStart(BitMap.count, '0') }

        set hex(value) { this.int = parseInt(value, 16) }
        get hex()      { return `0x${this.int.toString(16).padStart(BitMap.byteLen, '0')}` }

        set chars(value) { if (BitMap.charMap && value) this.list = BitMap._fromChars(value) }
        get chars()      { return BitMap.charMap && this._toChars() }

        set list(array) { this.int = BitMap._toInt(array) }
        get list()      {
            if (!this.int) return BitMap.emptyList
            return BitMap.flags.filter((flag: Flag) => this.intersects(BitMap._intmap[flag]))
        }

        set inverse(array) { this.int = ~BitMap._toInt(array) }
        get inverse()      {
            const flags = BitMap.flags.filter((flag: Flag) => !this.intersects(BitMap._intmap[flag]))
            return flags.length ? flags : BitMap.emptyList
        }

        get count() { return this.int ? this.list.length : 0 }

        toJSON()   { return this.int }
        toString() { return this.chars ?? this.list.join(STR_DELIM)}

        set(...values: BitMapValue<BitMapBase<Flag>>[]) {
            this.int = BitMap._toInt(values)
            return this
        }

        add(...values: BitMapValue<BitMapBase<Flag>>[]) {
            this.int |= BitMap._toInt(values)
            return this
        }

        remove(...values: BitMapValue<BitMapBase<Flag>>[]) {
            this.int &= ~BitMap._toInt(values)
            return this
        }

        isSubset(...values: BitMapValue<BitMapBase<Flag>>[]) {
            return this.int ? (this.int & BitMap._toInt(values)) === this.int : false
        }

        isSuperset(...values: BitMapValue<BitMapBase<Flag>>[]) {
            const int = BitMap._toInt(values)
            return int ? (this.int & int) === int : false
        }

        intersects(...values: BitMapValue<BitMapBase<Flag>>[]) {
            return Boolean(this.int & BitMap._toInt(values))
        }

        isExclusive(...values: BitMapValue<BitMapBase<Flag>>[]) {
            return this.int ? !(this.int & BitMap._toInt(values)) : !!BitMap._toInt(values)
        }

        equals(...values: BitMapValue<BitMapBase<Flag>>[]) {
            return this.int === BitMap._toInt(values)
        }



        //  **** PRIVATE HELPERS **** \\

        /** Convert any BitMapValue to a Number */
        private static _toInt(value?: BitMapValue<BitMapBase<Flag>> | BitMapValue<BitMapBase<Flag>>[]): number {
            if (!value)                    return 0
            if (typeof value === 'number') return value & this.mask
            if (typeof value === 'string') return BitMap._intmap[value] ?? 0
            if (!Array.isArray(value))     return value.int ?? 0
            return (value as any[])
                .reduce((int, flag) => int | this._toInt(flag), 0)
        }

        /** Convert a string to a flagList using toString encoding */
        private static _fromString(str: string | string[]): Flag[] {
            if (Array.isArray(str)) return str.flatMap((s) => this._fromString(s))
            if (this.isIn(str)) return [str]
            if (str === this._empty) return []
            if (str.includes(STR_DELIM)) return this._fromString(str.split(STR_DELIM))
            if (!str) return []
            throw new Error(`Unrecognized string while parsing BitMap: ${str}`)
        }

        /** Convert a BitMap to a string using CharacterMap */
        private _toChars() {
            if (!BitMap.charMap) throw new Error(`Character Map is not defined for BitMap.chars`)

            return this.list
                .map((flag) => BitMap.charMap?.[flag])
                .join('')
        }
        
        /** Convert a string to a flagList using CharacterMap */
        private static _fromChars(chars: string | string[]) {
            if (!this.charMap) throw new Error(`Character Map is not defined for BitMap.chars`)

            if (Array.isArray(chars)) chars.join('')
            return (this.flags as Flag[])
                .filter((flag) => this.charMap?.[flag] && chars.includes(this.charMap[flag]))
        }
    }

    return BitMap
}


// HELPERS

const toIntMap = <Flag extends string>(flagList: readonly Flag[]) =>
    flagList.reduce(
        (map, flag, n) => ({ ...map, [flag]: 1 << n }),
        {} as Record<Flag, number>
    )

const toMap = <Flag extends string>(intMap: Record<Flag, number>, BitMap: BitMapStatic<Flag>) =>
    Object.freeze(mapObject(intMap, (int) => new BitMap(int)))