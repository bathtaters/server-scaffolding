import type { DefinitionSchema, FormSchemaOf } from '../types/Model.d'
import type { AccessBitMap } from '../types/Users.d'
import type { FormAction } from '../types/gui.d'
import { matchedData } from 'express-validator'
import { ModelAccess } from '../types/Users'
import { actions } from '../types/gui'
import { parseBoolean } from '../utils/validate.utils'
import { badData } from '../config/errors.engine'

const parseBool = parseBoolean(true)


/** Get an access type based on profile action */
export const actionAccess = (action: FormAction) =>
  action === actions.find ? ModelAccess.map.read : ModelAccess.map.write

/** Get list of button labels based on access */
export const labelsByAccess = (access?: AccessBitMap) => !access ? [] :
  Object.values(actions).filter((action) => access.intersects(actionAccess(action)))


/** Get links to post from base URL */
export const actionURLs = <List extends FormAction = FormAction>(baseURL: string, actionList?: List[]) =>
  (actionList || Object.values(actions)).reduce(
    (urls, action) => Object.assign(urls, { [action]: baseURL + action.toLowerCase() })
  , {} as Record<List, string>)

  
/** Retrieve FormData from a validated request */
export function getFormData<D extends DefinitionSchema>(req: Express.Request) {
  return matchedData(req) as Record<string,any> & Partial<FormSchemaOf<D>>
}


/** Default filter for filterFormData & toQueryString */
const defaultFilter = <T extends Record<string | number | symbol, any>>
  (val: T[keyof T], key: keyof T) => val != null && val !== ''


/** Filter function for Object */
export const filterFormData = <T extends object, B extends object = {}, Result extends object = Partial<T & B>>(
  formData: T, baseObject?: B,
  filterCb = defaultFilter<T>
) =>
  Object.entries(formData).reduce(
    (filtered, [key, val]) =>
      filterCb(val, key as keyof T) ?
        { ...filtered, [key]: baseObject && key in baseObject ? parseBool(val) : val } :
        filtered,

    { ...(baseObject || {}) } as Result
  )


const strOrNumOnly = (obj: any): obj is Record<string, string> => {
  const vals = Object.values(obj)
  return vals.length ? vals.every((v) => typeof v === 'string' || typeof v === 'number') : false
}

/** Convert object to queryString (Accepts stringified object, deletes null/empty values) */
export const toQueryString = <T extends Record<string,any>>(obj?: string | T, filter = defaultFilter<T>) => {
  if (!obj) return ''
  
  if (typeof obj === 'string') {
    if (obj.charAt(0) !== '{') throw badData('Query string', obj)
    obj = JSON.parse(obj)
  }
  if (typeof obj !== 'object' || !obj) throw badData('Query string', obj)
  
  for (const key in obj) {
    if (!filter(obj[key], key)) delete obj[key]
  }

  return strOrNumOnly(obj) ? `?${new URLSearchParams(obj).toString()}` : ''
}