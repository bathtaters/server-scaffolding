import type { BitMapBase, BitMapValue } from "../types/BitMap.d"
import type { BitMapObjBase, BitMapObjValue, BitMapObject } from "../types/BitMapObj.d"
import RegEx from "./regex"
import BitMapFactory from "./BitMap"
import { isIn } from "../utils/common.utils"

export const DEFAULT_KEY = 'default', KF_DELIM = '-', STR_DELIM = ', '

export default function BitMapObjFactory<Key extends string, Flag extends string>(
  keyList: readonly Key[],
  flagList: readonly Flag[],
  characterMap?: Readonly<Record<Flag, string>>
) {
  // Object String Constants
  const INVALID_KEY = [':', ...STR_DELIM] as const, INVALID_CHAR = [']', ...STR_DELIM] as const


  // Error check for toString()
  if (keyList.some((key) => INVALID_KEY.some((c) => key.includes(c))))
    throw new Error(`Key List contains invalid characters "${INVALID_KEY.join('')}": ${keyList.join(', ')}`)

  if (characterMap && Object.values<string>(characterMap).some((chr) => INVALID_CHAR.some((c) => chr.includes(c))))
    throw new Error(`Character Map contains invalid characters "${INVALID_CHAR.join('')}": ${JSON.stringify(characterMap)}`)



  /** Represents an object of form { keyName: BitMap, ..., default: BitMap } */
  class BitMapObj implements BitMapObjBase<Key, Flag> {

    //  **** STATIC **** \\
    private static readonly _bitmap = BitMapFactory<Flag>(flagList, undefined, characterMap)
    private static readonly _keys = [ ...keyList ] as const

    private static readonly _keyFlagRegex = RegEx(`^(${this._keys.join('|')})${KF_DELIM}(${this._bitmap.flags.join('|')})$`)
    private static readonly _objStrRegex = RegEx(/^\s*([^:\s]+):\s\[([^\]]+)\]\s*$/)
    private static readonly _toObjStr = ([key, bits]: [string, BitMapBase<Flag>]) => `${key}: [${bits.chars ?? ''}]`
    
    /** Main Flag to Int map */
    static get map()     { return this._bitmap.map     }
    /** List of all object Keys (Except for the default key) */
    static get keys()    { return this._keys           }
    /** List of all Flags/Values */
    static get values()  { return this._bitmap.flags   }
    /** Map of Flags to single-character representations */
    static get charMap() { return this._bitmap.charMap }
    /** Total number of keys in this object (Minus the default key) */
    static get count()   { return this.keys.length     }
    
    /** Get mask for all values, except for the given value */
    static mask(except: BitMapValue<BitMapBase<Flag>> = 0) { return BitMapObj._bitmap.mask & ~this.bitMap(except).int }
    
    /** Create a new related BitMap object */
    static bitMap(...values: BitMapValue<BitMapBase<Flag>>[]) { return new this._bitmap(...values) }

    /** Tests if a string is a Key of this object */
    static isKey(str: string): str is Key { return this.keys.includes(str as any) }
    /** Tests if a string is a Flag/Value of this object */
    static isValue = this._bitmap.isIn

    /** Tests if a string is a KeyFlag string (Of the form "Key-Flag") */
    static isKeyFlag(str: string): str is `${Key}${typeof KF_DELIM}${Flag}` {
      return this._keyFlagRegex.test(str)
    }


    //  **** INSTANCE **** \\
    private _object: BitMapObject<Key, Flag>

    /** Create a BitMapObject from an array of KeyFlags or an Object of numbers */
    constructor()
    constructor(bitmapObjStr?: string, defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(keyFlagArr?: string[], defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(keyNumObj?: BitMapObjValue<Key, Flag>, defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(objOrArr?: BitMapObjValue<Key, Flag> | string[] | string, defaultValue?: BitMapValue<BitMapBase<Flag>>) {
      this._object = BitMapObj._baseObj(defaultValue)

      if (typeof objOrArr === 'string') this._updateString(objOrArr)
      else if (Array.isArray(objOrArr)) this._updateArray(objOrArr)
      else if (typeof objOrArr === 'object') this._updateObject(objOrArr)
    }

    get obj()  { return this._object }


    // Mutatable methods

    get(key: Key | typeof DEFAULT_KEY): BitMapBase<Flag> {
      return this.obj[key]?.int ? this.obj[key] : this.obj[DEFAULT_KEY]
    }

    reset(defaultValue?: BitMapValue<BitMapBase<Flag>>) {
      this._object = BitMapObj._baseObj(defaultValue)
      return this
    }

    setArray(keyFlagArr: string[]) {
      this.reset()
      return this._updateArray(keyFlagArr)
    }

    setObject(bitmapValueObj: BitMapObjValue<Key, Flag>) {
      this.reset()
      return this._updateObject(bitmapValueObj)
    }

    addAll(value: BitMapValue<BitMapBase<Flag>>) {
      for (const key in this.obj) {
        if (key === DEFAULT_KEY || (isIn(key, this.obj) && this.obj[key].int))
          this.obj[key].add(value)
      }
      return this
    }

    removeAll(value: BitMapValue<BitMapBase<Flag>>) {
      for (const key in this.obj) {
        if (key === DEFAULT_KEY || (isIn(key, this.obj) && this.obj[key].int))
          this.obj[key].remove(value)
      }
      return this
    }

    addObject(valueObj: BitMapObjValue<Key, Flag>) {
      for (const key in valueObj) {
        isIn(key, this.obj) && this.obj[key].add(valueObj[key])
      }
      return this
    }

    removeObject(valueObj: BitMapObjValue<Key, Flag>) {
      for (const key in valueObj) {
        isIn(key, this.obj) && this.obj[key].remove(valueObj[key])
      }
      return this
    }

    // Passthrough test methods

    isSuperset(value: BitMapValue<BitMapBase<Flag>>, key: string = DEFAULT_KEY) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).isSuperset(value)
    }
    isSubset(value: BitMapValue<BitMapBase<Flag>>, key: string = DEFAULT_KEY) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).isSubset(value)
    }
    intersects(value?: BitMapValue<BitMapBase<Flag>>, key: string = DEFAULT_KEY) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).intersects(value)
    }
    isExclusive(value?: BitMapValue<BitMapBase<Flag>>, key: string = DEFAULT_KEY) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).isExclusive(value)
    }
    equals(value?: BitMapValue<BitMapBase<Flag>>, key: string = DEFAULT_KEY) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).equals(value)
    }


    // Export methods

    toString() {
      if (!BitMapObj.charMap) throw new Error('BitMapObj.toString requires CharacterMap')

      return Object.entries(this.obj)
        .filter(([key, bits]) => bits.int || key === DEFAULT_KEY)
        .map(BitMapObj._toObjStr).join(STR_DELIM)
    }

    toArray() {
      return Object.entries(this.obj)
        .flatMap(([key, bitmap]) => bitmap.list.map((flag) => `${key}${KF_DELIM}${flag}`))
    }

    toJSON() { return this.obj }



    //  **** PRIVATE HELPERS **** \\

    private _updateString(bitmapObjStr: string) {
      const charMap = BitMapObj.charMap
      if (!charMap) throw new Error('BitMapObj(string) requires CharacterMap')

      for (const entry of bitmapObjStr.split(STR_DELIM)) {
        const split = BitMapObj._splitObjStr(entry)
        if (!split) continue;

        const flags = (Object.keys(charMap) as Flag[])
          .filter((flag) => split[1].includes(charMap[flag]))

        this.obj[split[0]]?.set(flags)
      }
      return this
    }

    private _updateArray(keyFlagArr: string[]) {
      for (const keyFlag of keyFlagArr) {
        const split = BitMapObj._splitKeyFlag(keyFlag)

        if (split) this.obj[split[0]]?.set(split[1])
      }
      return this
    }
    
    
    private _updateObject(bitmapValueObj: BitMapObjValue<Key, Flag>) {
      for (const key in bitmapValueObj) {
        isIn(key, this.obj) && this.obj[key].set(bitmapValueObj[key])
      }
      return this
    }


    // Private Static Helpers

    private static _splitKeyFlag(str: string) {
      const match = str.match(this._keyFlagRegex)
      if (!match || !match[1] || !match[2]) return undefined

      return [ match[1], match[2] ] as [ Key | typeof DEFAULT_KEY, Flag ]
    }


    private static _splitObjStr(str: string) {
      const match = str.match(this._objStrRegex)
      if (!match || !match[1] || !match[2]) return undefined

      return [ match[1], match[2] ] as [ Key | typeof DEFAULT_KEY, string ]
    }


    private static _baseObj(defaultValue?: BitMapValue<BitMapBase<Flag>>) {
      return new Proxy({
        ...Object.fromEntries(keyList.map((key) => [ key, this.bitMap() ])),
        [DEFAULT_KEY]: this.bitMap(defaultValue ?? 0),

      } as Record<Key | typeof DEFAULT_KEY, InstanceType<typeof BitMapObj['_bitmap']>>,

      {
        set(obj, key, value) {
          if (!isIn(key, obj)) return false
          obj[key].set(value)
          return true
        },

        deleteProperty(obj, key) {
          if (!isIn(key, obj)) return false
          obj[key].set()
          return true
        },
      })
    }
  }

  return BitMapObj
}
