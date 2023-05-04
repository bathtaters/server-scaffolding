import type Model from '../models/Model'
import type { AdapterType, Definition, DefinitionSchema, SchemaBase, ArrayDefinitions, CommonDefinition } from '../types/Model.d'
import type { WhereData, WhereDataValue } from '../types/db.d'
import { hasDupes, isIn } from '../utils/common.utils'
import { childLabel, adapterTypes } from '../types/Model'
import { defaultPrimary, defaultPrimaryType, SQL_ID } from '../config/models.cfg'
import { dbFromType, htmlFromType, getAdapterFromType, setAdapterFromType, stripPrimaryDef, sanitizeSchemaData } from '../utils/model.utils'
import { parseTypeStr } from '../utils/validate.utils'
import { whereLogic, whereNot, whereOp } from '../types/db'


export function adaptSchemaEntry
  <Schema extends SchemaBase, DBSchema extends SchemaBase, K extends keyof (Schema & DBSchema) & string>
  (settings: Definition<Schema, DBSchema, K>)
{
  if (!settings.type && settings.typeStr) parseTypeStr(settings)

  if (!settings.type && settings.isPrimary) settings = { ...settings, ...defaultPrimaryType }

  if (settings.db == null && !settings.isArray)     settings.db                = dbFromType(settings)
  if (!settings.isPrimary && settings.html == null) settings.html              = htmlFromType(settings)
  if (settings[adapterTypes.get] == null)           settings[adapterTypes.get] = getAdapterFromType(settings)
  if (settings[adapterTypes.set] == null)           settings[adapterTypes.set] = setAdapterFromType(settings)
  delete settings.isPrimary

  if (settings.isHTML && (settings.type !== 'string' || !settings.hasSpaces))
    throw new Error(`Schema cannot have non-string* HTML. Type: ${settings.typeStr || settings.type}`)

  return settings
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


type RAModel<S extends SchemaBase, D extends SchemaBase> = Pick<Model<S,D>, 'schema'|'hidden'|'children'>

const opType = (data: any) => typeof data !== 'object' || !data ? undefined :
  Object.keys(whereOp).find((key) => key in data) as keyof typeof whereOp | undefined

export async function runAdapters<S extends SchemaBase, D extends SchemaBase>(adapterType: typeof adapterTypes.set, data: S, model: RAModel<S,D>):
  Promise<D>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>(adapterType: typeof adapterTypes.get, data: D, model: RAModel<S,D>):
  Promise<S>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>(adapterType: typeof adapterTypes.set, data: Partial<S>, model: RAModel<S,D>):
  Promise<Partial<D>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>(adapterType: typeof adapterTypes.get, data: Partial<D>, model: RAModel<S,D>):
  Promise<Partial<S>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>(adapterType: typeof adapterTypes.set, data: WhereData<S>, model: RAModel<S,D>):
  Promise<WhereData<D>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase>(adapterType: AdapterType, data: WhereData<S & D>, model: RAModel<S,D>):
  Promise<Partial<WhereData<D> | S>>;
export async function runAdapters<S extends SchemaBase, D extends SchemaBase = S>(adapterType: AdapterType, data: WhereData<S & D>, model: RAModel<S,D>) {
  let result: any = {}

  await Promise.all(Object.entries<WhereDataValue<S & D>>(data).map(async ([key,val]) => {

    if (isIn(key, whereLogic) || key === whereNot) return Array.isArray(val) ?
      Promise.all(val.map((d) => runAdapters(adapterType, d, model))) :
      runAdapters(adapterType, val ?? {}, model)

    if (!isIn(key, model.schema) || (adapterType === adapterTypes.get && model.hidden.includes(key))) return;
    
    const adapter = model.schema[key][adapterType]
    if (typeof adapter !== 'function') return result[key] = val

    const opKey = opType(val)
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
            typeStr: 'int',
            limits: def.limits && (def.limits.elem || def.limits.array) ? def.limits.array : def.limits,
          }),

          [childLabel.value]: adaptSchemaEntry({
            typeStr: (def.typeStr || def.type).replace('[]','') as NonNullable<Definition['typeStr']>,
            limits: def.limits && (def.limits.elem || def.limits.array) ? def.limits.elem : undefined,
            isHTML: def.isHTML,
          }),
        }
      }
    },
    
    {}
  )
}

