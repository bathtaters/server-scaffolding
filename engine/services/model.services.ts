import type Model from '../models/Model'
import type { AdapterType, Definition, DefinitionSchema, SchemaBase, ArrayDefinitions, CommonDefinition, AdapterData, AdapterDataValue, DefinitionNormal } from '../types/Model.d'
import type { UpdateData, UpdateValue, WhereData } from '../types/db.d'
import type { ValidationBasic } from '../types/validate.d'
import { childLabel, adapterTypes } from '../types/Model'
import { updateFunctions, whereLogic, whereNot } from '../types/db'
import { hasDupes, isIn } from '../utils/common.utils'
import { dbFromType, htmlFromType, getAdapterFromType, setAdapterFromType, stripPrimaryDef, sanitizeSchemaData } from '../utils/model.utils'
import { expandTypeStr } from '../utils/validate.utils'
import { getOpType } from '../utils/db.utils'
import { defaultPrimary, defaultPrimaryType, SQL_ID } from '../config/models.cfg'


// @ts-ignore -- Ignore all 'no implicit any' errors in this function -- TODO fix typings so these go away
const projectionFunctions = updateFunctions as any
export function projectedValue<T>(currentValue: T, update: UpdateValue<T>): T {
  if (typeof update !== 'object' || !update) return update

  const valueType = typeof currentValue,
    funcType = getOpType(update) as keyof typeof update | undefined

  if (funcType && typeof projectionFunctions[valueType]?.[funcType] === 'function')
    return projectionFunctions[valueType][funcType](currentValue, update[funcType])

  return update as T
}


export function adaptSchemaEntry
  <Schema extends SchemaBase, DBSchema extends SchemaBase, K extends keyof (Schema & DBSchema) & string>
  ({ isPrimary, ...definition }: Definition<Schema, DBSchema, K>): DefinitionNormal<Schema, DBSchema, K>
{
  if (!definition.typeStr && !isPrimary) throw new Error(`Definition is missing typeStr (or isPrimary != true): ${JSON.stringify(definition)}`)

  const defType = !definition.typeStr ? defaultPrimaryType : expandTypeStr(definition as ValidationBasic)

  let normalized = { ...definition, ...defType } as DefinitionNormal<Schema, DBSchema, K>

  if (normalized.db == null)                 normalized.db                = !defType.isArray && dbFromType(defType, isPrimary)
  if (normalized.html == null)               normalized.html              = !isPrimary && htmlFromType(defType)
  if (normalized[adapterTypes.get] == null)  normalized[adapterTypes.get] = getAdapterFromType(defType, definition.isBitmap)
  if (normalized[adapterTypes.set] == null)  normalized[adapterTypes.set] = setAdapterFromType(defType, definition.isBitmap)

  if (normalized.isHTML && (normalized.type !== 'string' || !normalized.hasSpaces))
    throw new Error(`Schema cannot have non-string* HTML. Type: ${definition.typeStr || normalized.type}`)

  return normalized
}


export function getPrimaryIdAndAdaptSchema
  <Schema extends SchemaBase, DBSchema extends SchemaBase = Schema>
  (schema: DefinitionSchema<Schema,DBSchema>, title = 'model', isArray = false)
{
  let primaryId: (keyof (Schema & DBSchema) & string) | undefined
  
  let key = primaryId
  for (key in schema) {
    if (schema[key].isPrimary) {
      if (primaryId) throw new Error(`${title} has more than one primary ID: ${String(primaryId)}, ${key}`)
      if (schema[key].isArray) throw new Error(`Primary ID cannot be array type: ${title}.${key}`)
      primaryId = key
    }

    schema[key] = adaptSchemaEntry<Schema, DBSchema, typeof key>(schema[key])
  }

  if (!primaryId) {
    primaryId = isArray ? SQL_ID : defaultPrimary
    schema[primaryId] = { ...defaultPrimaryType, ...(schema[primaryId] || {}), isPrimary: true }
    delete schema[primaryId].db

    schema[primaryId] = adaptSchemaEntry<Schema, DBSchema, typeof primaryId>(schema[primaryId])
  }

  if (!Object.values(schema).filter(({ db }) => db).length)
    throw new Error(`DB schema for ${title} was unable to be created or has no entries.`)

  if (hasDupes(Object.keys(schema).map((k) => typeof k === 'string' ? k.toLowerCase() : k)))
    throw new Error(`Definitions for ${title} contain duplicate key names: ${Object.keys(schema).join(', ')}`)

  return primaryId
}


export async function runAdapters<S extends SchemaBase, D extends SchemaBase>
  (adapterType: typeof adapterTypes.set, data: S, model: RAModel<S,D>):
  Promise<D>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>
  (adapterType: typeof adapterTypes.get, data: D, model: RAModel<S,D>):
  Promise<S>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>
  (adapterType: typeof adapterTypes.set, data: Partial<S>, model: RAModel<S,D>):
  Promise<Partial<D>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>
  (adapterType: typeof adapterTypes.get, data: Partial<D>, model: RAModel<S,D>):
  Promise<Partial<S>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>
  (adapterType: typeof adapterTypes.set, data: WhereData<S>, model: RAModel<S,D>):
  Promise<WhereData<D>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>
  (adapterType: typeof adapterTypes.set, data: UpdateData<S>, model: RAModel<S,D>):
  Promise<UpdateData<D>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>
  (adapterType: AdapterType, data: AdapterData<S & D>, model: RAModel<S,D>):
  Promise<AdapterData<D & S>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase = S>
  (adapterType: AdapterType, data: AdapterData<S & D>, model: RAModel<S,D>) {
  let result: any = {}

  await Promise.all(Object.entries<AdapterDataValue<S & D>>(data).map(async ([key,val]) => {

    if (isIn(key, whereLogic) || key === whereNot) return Array.isArray(val) ?
      Promise.all(val.map((d) => runAdapters(adapterType, d, model))) :
      runAdapters(adapterType, val ?? {}, model)

    if (!isIn(key, model.schema) || (adapterType === adapterTypes.get && model.hidden.includes(key))) return;
    
    const adapter = model.schema[key][adapterType]
    if (typeof adapter !== 'function') return result[key] = val

    const opKey = getOpType(val)
    const opVal: (S & D)[keyof (S & D)] = opKey ? (val as any)[opKey] : val
    
    const adapterResult = await adapter(opVal, result)
    result[key] = opKey ? { [opKey]: adapterResult ?? opVal } : adapterResult ?? opVal
  }))

  return adapterType === adapterTypes.set ? sanitizeSchemaData(result, model) : result
}



export function extractChildren<S extends SchemaBase, D extends SchemaBase>(schema: DefinitionSchema<S,D>, idDefinition: CommonDefinition<S,D>) {
  return Object.entries(schema).reduce<ArrayDefinitions<S & D>>(
    (arrayTables, [arrayName, def]) => {
      if (!def.isArray || def.db) return arrayTables

      return {
        ...arrayTables,

        [arrayName]: {
          [childLabel.foreignId]: stripPrimaryDef(idDefinition),

          [childLabel.index]: adaptSchemaEntry({
            type: 'int',
            limits: def.limits && (def.limits.elem || def.limits.array) ? def.limits.array : def.limits,
          }),

          [childLabel.value]: adaptSchemaEntry({
            type: (def.typeStr || def.type).replace('[]','') as NonNullable<Definition['typeStr']>,
            limits: def.limits && (def.limits.elem || def.limits.array) ? def.limits.elem : undefined,
            isHTML: def.isHTML,
          }),
        }
      }
    },
    
    {}
  )
}



type RAModel<S extends SchemaBase, D extends SchemaBase> = Pick<Model<S,D>, 'schema'|'hidden'|'children'>