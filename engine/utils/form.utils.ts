import type { ModelsType } from '../types/Users.d'
import { parseBoolean } from '../utils/validate.utils'
import { type ProfileActions, actions } from '../types/gui.d'
import { badData } from '../config/errors.engine'
const parseBool = parseBoolean(true)


// Get list of button labels based on access
export const actionAccess = (action: ProfileActions) => action === actions.find ? 'read' : 'write'
export const labelsByAccess = (accessTypes: ModelsType[]) =>
  Object.values(actions).filter((action) => accessTypes.includes(actionAccess(action)))


// Get links to post from base URL
export const actionURLs = <List extends ProfileActions = ProfileActions>(baseURL: string, actionList?: List[]) =>
  (actionList || Object.values(actions)).reduce(
    (urls, action) => Object.assign(urls, { [action]: baseURL + action.toLowerCase() })
  , {} as Record<List, string>)


// Default filter for filterFormData & toQueryString
const defaultFilter = <T extends Record<string | number | symbol, any>>
  (val: T[keyof T], key: keyof T) => val != null && val !== ''


// Filter function for Object
export const filterFormData = <T extends object, B extends object = {}, Result extends object = Partial<T & B>>(
  formData: T, baseObject?: B,
  filterCb = defaultFilter<T>
) =>
  Object.entries(formData).reduce((filtered, [key, val]) =>
    filterCb(val, key as keyof T) ?
      Object.assign(filtered, { [key]: baseObject && key in baseObject ? parseBool(val) : val }) :
      filtered
, { ...(baseObject || {}) } as Result)


// Convert object to queryString (Accepts stringified object, deletes null/empty values)
const hasStrValues = (obj: any): obj is Record<string, string> => {
  const vals = Object.values(obj)
  return vals.length ? vals.every((v) => typeof v === 'string') : false
}

export const toQueryString = <T extends Record<string,any>>(obj: string | T, filter = defaultFilter<T>) => {
  if (!obj) return ''
  
  if (typeof obj === 'string') {
    if (obj.charAt(0) !== '{') throw badData('Query string', obj)
    obj = JSON.parse(obj)
  }
  if (typeof obj !== 'object' || !obj) throw badData('Query string', obj)
  
  for (const key in obj) {
    if (!filter(obj[key], key)) delete obj[key]
  }

  return hasStrValues(obj) ? `?${new URLSearchParams(obj).toString()}` : ''
}