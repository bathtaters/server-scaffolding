import type Model from '../models/Model'
import type { AdapterType, Definition, DefinitionSchema, SchemaBase, ArrayDefinitions } from '../types/Model.d'
import { hasDupes, isIn } from '../utils/common.utils'
import { arrayLabel, adapterTypes } from '../types/Model.d'
import { defaultPrimary, defaultPrimaryType, SQL_ID } from '../config/models.cfg'
import { dbFromType, htmlFromType, getAdapterFromType, setAdapterFromType, stripPrimaryDef } from '../utils/model.utils'
import { parseTypeStr } from '../utils/validate.utils'
import { ModelBase } from '../models/Model'


export function adaptSchemaEntry<D extends Definition>(settings: D) {
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


export function getPrimaryIdAndAdaptSchema<D extends DefinitionSchema>(schema: D, title = 'model', isArray = false) {
  let primaryId: keyof D | undefined

  for (const key in schema) {
    if (schema[key].isPrimary) {
      if (primaryId) throw new Error(`${title} has more than one primary ID: ${String(primaryId)}, ${key}`)
      if (schema[key].isArray) throw new Error(`Primary ID cannot be array type: ${title}.${key}`)
      primaryId = key
    }

    schema[key] = adaptSchemaEntry(schema[key])
  }

  if (!primaryId) {
    primaryId = isArray ? SQL_ID : defaultPrimary
    schema[primaryId] = { ...defaultPrimaryType, ...(schema[primaryId] || {}), isPrimary: true }
    delete schema[primaryId].db

    schema[primaryId] = adaptSchemaEntry(schema[primaryId])
  }

  if (!Object.values(schema).filter(({ db }) => db).length)
    throw new Error(`DB schema for ${title} was unable to be created or has no entries.`)

  if (hasDupes(Object.keys(schema).map((k) => typeof k === 'string' ? k.toLowerCase() : k)))
    throw new Error(`Definitions for ${title} contain duplicate key names: ${Object.keys(schema).join(', ')}`)

  return primaryId
}


export async function runAdapters<Model extends ModelBase>(
  adapterType: AdapterType,
  data: Partial<Record<keyof Model['schema'], any>>,
  { schema, hidden }: Model
) {
  let result: any = {}

  await Promise.all(Object.keys(schema).map(async (key) => {
    if (!isIn(key, data) || adapterType !== adapterTypes.get || hidden.includes(key)) return
    
    const adapter = schema[key][adapterType]
    if (typeof adapter !== 'function') result[key] = data[key]
    else result[key] = (await adapter(data[key], data)) ?? data[key]
  }))

  return result
}



export function extractArrays<S extends SchemaBase>(schema: DefinitionSchema<S>, idDefinition: Definition) {
  return Object.entries(schema).reduce<ArrayDefinitions<S>>(
    (arrayTables, [arrayName, def]) => {
      if (!def.isArray || def.db) return arrayTables

      return {
        ...arrayTables,

        [arrayName]: {
          [arrayLabel.foreignId]: stripPrimaryDef(idDefinition),

          [arrayLabel.index]: adaptSchemaEntry({
            typeStr: 'int',
            limits: def.limits && (def.limits.elem || def.limits.array) ? def.limits.array : def.limits,
          }),

          [arrayLabel.value]: adaptSchemaEntry({
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

