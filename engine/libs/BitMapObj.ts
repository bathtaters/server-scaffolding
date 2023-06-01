import type { BitMapBase, BitMapValue } from "../types/BitMap.d"
import type { BitMapObjBase, BitMapObjStatic, BitMapObjValue, BitMapObject } from "../types/BitMapObj.d"
import RegEx from "./regex"
import BitMapFactory from "./BitMap"
import { isIn } from "../utils/common.utils"
import { ExtendedType } from "../types/Model"

export const KF_DELIM = '-', STR_DELIM = ', ', STR_SPLIT = ':', STR_WRAP = '[]'

export default function BitMapObjFactory<Key extends string, Flag extends string, DefKey extends string>(
  keyList: readonly Key[],
  flagList: readonly Flag[],
  defaultKey: DefKey,
  characterMap?: Readonly<Record<Flag, string>>,
) {
  
  // Error check for toString()
  const INVALID_KEY = [STR_SPLIT, ...STR_DELIM] as const,
    INVALID_CHAR = [STR_WRAP[1], ...STR_DELIM] as const

  if (keyList.some((key) => INVALID_KEY.some((c) => key.includes(c))))
    throw new Error(`BitMapObj Key contains an invalid character "${INVALID_KEY.join('')}" or space: ${keyList.join(', ')}`)

  if (characterMap && Object.values<string>(characterMap).some((chr) => INVALID_CHAR.some((c) => chr.includes(c))))
    throw new Error(`Character Map contains invalid characters "${INVALID_CHAR.join('')}": ${JSON.stringify(characterMap)}`)



  /** Represents an object of form { keyName: BitMap, ..., default: BitMap } */
  class BitMapObj extends ExtendedType<string> implements BitMapObjBase<Key, Flag, DefKey> {

    //  **** STATIC **** \\
    private static readonly _bitmap = BitMapFactory<Flag>(flagList, undefined, characterMap)
    private static readonly _keys = [ ...keyList ] as const
    private static readonly _default = defaultKey
    
    /** Main Flag to Int map */
    static get map():     BitMapObjStatic<Key, Flag, DefKey>['map']     { return this._bitmap.map     }
    /** List of all object Keys (Except for the default key) */
    static get keys():    BitMapObjStatic<Key, Flag, DefKey>['keys']    { return this._keys           }
    /** Default key */
    static get defKey():  BitMapObjStatic<Key, Flag, DefKey>['defKey']  { return this._default        }
    /** List of all object Keys (Including the default key) */
    static get allKeys(): BitMapObjStatic<Key, Flag, DefKey>['allKeys'] { return [ ...this.keys, this.defKey ] }
    /** List of all Flags/Values */
    static get values():  BitMapObjStatic<Key, Flag, DefKey>['values']  { return this._bitmap.flags   }
    /** Map of Flags to single-character representations */
    static get charMap(): BitMapObjStatic<Key, Flag, DefKey>['charMap'] { return this._bitmap.charMap }
    /** Total number of keys in this object (Minus the default key) */
    static get count():   BitMapObjStatic<Key, Flag, DefKey>['count']   { return this.keys.length     }

    private static readonly _keyFlagRegex = keyFlagRegex(this.allKeys, this.values)
    private static readonly _objStrRegex = objStrRegex(this.allKeys, this.charMap)
    private static readonly _toObjStr = toObjStr
    
    /** Get mask for all values, except for the given value */
    static mask(except: BitMapValue<BitMapBase<Flag>> = 0) { return BitMapObj._bitmap.mask & ~this.bitMap(except).value }
    
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
    private _object: BitMapObject<Key, Flag, DefKey>

    /** Create a BitMapObject from an Object of Bitmap values */
    constructor()
    constructor(obj?: BitMapObjValue<Key, Flag, DefKey>, defaultValue?: BitMapValue<BitMapBase<Flag>>)
    constructor(obj?: BitMapObjValue<Key, Flag, DefKey>, defaultValue?: BitMapValue<BitMapBase<Flag>>) {
      super()
      this._object = BitMapObj._baseObj(defaultValue)
      if (obj) this._updateObject(obj)
    }

    get obj()    { return this._object     }
    get defKey() { return BitMapObj.defKey }


    // Mutatable methods

    get(key: Key | DefKey): BitMapBase<Flag> {
      return this.obj[key]?.value ? this.obj[key] : this.obj[this.defKey]
    }

    reset(defaultValue?: BitMapValue<BitMapBase<Flag>>) {
      this._object = BitMapObj._baseObj(defaultValue)
      return this
    }

    setString(bitmapValueStr: string) {
      this.reset()
      return this._updateString(bitmapValueStr)
    }

    setArray(keyFlagArr: string[]) {
      this.reset()
      return this._updateArray(keyFlagArr)
    }

    setObject(bitmapValueObj: BitMapObjValue<Key, Flag, DefKey>) {
      this.reset()
      return this._updateObject(bitmapValueObj)
    }

    parse(value?: any) { // Parse HTML Form
      if (typeof value === 'string')           value = stringToArray(value)

      if (typeof value !== 'object' || !value) return this.reset()
      else if (Array.isArray(value))           return this.setArray(value)
      else                                     return this.setObject(value)
    }

    addAll(value: BitMapValue<BitMapBase<Flag>>) {
      for (const key in this.obj) {
        if (key === this.defKey || (isIn(key, this.obj) && this.obj[key].value))
          this.obj[key as Key].add(value)
      }
      return this
    }

    removeAll(value: BitMapValue<BitMapBase<Flag>>) {
      for (const key in this.obj) {
        if (key === this.defKey || (isIn(key, this.obj) && this.obj[key].value))
          this.obj[key as Key].remove(value)
      }
      return this
    }

    addObject(valueObj: BitMapObjValue<Key, Flag, DefKey>) {
      for (const key in valueObj) {
        isIn(key, this.obj) && this.obj[key].add(valueObj[key])
      }
      return this
    }

    removeObject(valueObj: BitMapObjValue<Key, Flag, DefKey>) {
      for (const key in valueObj) {
        isIn(key, this.obj) && this.obj[key].remove(valueObj[key])
      }
      return this
    }

    // Passthrough test methods

    isSuperset(value: BitMapValue<BitMapBase<Flag>>, key: string = this.defKey) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).isSuperset(value)
    }
    isSubset(value: BitMapValue<BitMapBase<Flag>>, key: string = this.defKey) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).isSubset(value)
    }
    intersects(value?: BitMapValue<BitMapBase<Flag>>, key: string = this.defKey) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).intersects(value)
    }
    isExclusive(value?: BitMapValue<BitMapBase<Flag>>, key: string = this.defKey) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).isExclusive(value)
    }
    equals(value?: BitMapValue<BitMapBase<Flag>>, key: string = this.defKey) {
      if (!BitMapObj.isKey(key)) return false
      return this.get(key).equals(value)
    }


    // Export methods

    set(json: string) { // Get from DB
      if (json) this._updateObject(JSON.parse(json))
      else this.reset()
      return this
    }

    valueOf() { // Format for DB
      return JSON.stringify(this._object)
    }

    toString() { // Format for HTML
      if (!BitMapObj.charMap) throw new Error('BitMapObj.toString requires CharacterMap')

      return Object.entries<typeof this.obj[Key]>(this.obj)
        .filter(([key, bits]) => bits.value || key === this.defKey)
        .map(BitMapObj._toObjStr).join(STR_DELIM)
    }

    toArray() {
      return Object.entries<typeof this.obj[Key]>(this.obj)
        .flatMap(([key, bitmap]) => bitmap.list.map((flag) => `${key}${KF_DELIM}${flag}`))
    }


    //  **** PRIVATE HELPERS **** \\

    /** NOTE: Recommended to run reset() first, this will not overwrite keys that don't exist. */
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

    /** NOTE: Recommended to run reset() first, this will append values not overwrite. */
    private _updateArray(keyFlagArr: string[]) {
      for (const keyFlag of keyFlagArr) {
        const split = BitMapObj._splitKeyFlag(keyFlag)

        if (split) this.obj[split[0]]?.add(split[1])
      }
      return this
    }
    
    /** NOTE: Recommended to run reset() first, this will not overwrite keys that don't exist. */
    private _updateObject(bitmapValueObj: BitMapObjValue<Key, Flag, DefKey>) {
      for (const key in bitmapValueObj) {
        isIn(key, this.obj) && this.obj[key].set(bitmapValueObj[key])
      }
      return this
    }


    // Private Static Helpers

    private static _splitKeyFlag(str: string) {
      const match = str.match(this._keyFlagRegex)
      if (!match || !match[1] || !match[2]) return undefined

      return [ match[1], match[2] ] as [ Key | typeof BitMapObj['_default'], Flag ]
    }


    private static _splitObjStr(str: string) {
      const match = str.match(this._objStrRegex)
      if (!match || !match[1] || !match[2]) return undefined

      return [ match[1], match[2] ] as [ Key | typeof BitMapObj['_default'], string ]
    }


    private static _baseObj(defaultValue?: BitMapValue<BitMapBase<Flag>>) {
      return new Proxy({
        ...Object.fromEntries(keyList.map((key) => [ key, this.bitMap() ])),
        [this.defKey]: this.bitMap(defaultValue ?? 0),

      } as Record<Key | typeof BitMapObj['_default'], InstanceType<typeof BitMapObj['_bitmap']>>,

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



// String constructor / deconstructors

/** Convert object entries to character-mapped strings */
const toObjStr = ([key, bits]: [string, { chars?: string }]) =>
  `${key}${STR_SPLIT} ${STR_WRAP[0]}${bits.chars ?? ''}${STR_WRAP[1]}`

/** Match "(Key)-(Flag)" */
const keyFlagRegex = (keys: readonly string[], flags: readonly string[]) =>
  RegEx(`^\s*(${keys.join('|')})${KF_DELIM}(${flags.join('|')})\s*$`)

/** Match "(Key): [(FlagChars)]" */
const objStrRegex = (keys: readonly string[], charMap?: Record<any,string>) => RegEx(
  String.raw`^\s*(${
    keys.join('|')
  })${
  STR_SPLIT}\s${
  '\\'+STR_WRAP[0]}(${
    Object.values(charMap ?? {})
      .map((c) => `${c}?`).join()
  })${'\\'+STR_WRAP[1]}\s*$`
)

/** Convert a stringified JSON Object into an Object,
 * otherwise treat string as the first entry in an array. */
const stringToArray = (str: string) => {

  try {
    if (['[','{'].includes(str.charAt(0))) 
      return JSON.parse(str)

  } catch (e) {
    // Passthrough Syntax Errors
    if (!(e instanceof SyntaxError)) throw e
  }

  return str ? [str] : [] // Default: string is first entry in array
}