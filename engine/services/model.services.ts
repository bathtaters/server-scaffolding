import type Model from '../models/Model'
import type {
  Definition, DefinitionSchema, DefinitionNormal, DefinitionSchemaNormal,
  AdapterType, AdapterData, AdapterIn, AdapterOut, AdapterDefinition, AdapterDefinitionLoose, 
  ChildDefinitions, DefType, PrimaryIDOf,
} from '../types/Model.d'
import type { UpdateValue } from '../types/db.d'
import type { ValidationExpanded } from '../types/validate.d'
import { childLabel, adapterTypes, childIndexType, extendedTypeDefaults, viewMetaKey } from '../types/Model'
import { updateFunctions, whereLogic, whereNot } from '../types/db'
import logger from '../libs/log'
import { caseInsensitiveObject, getVal, hasDupes, isIn } from '../utils/common.utils'
import { dbFromType, htmlFromType, stripPrimaryDef, sanitizeSchemaData, getDefaultAdapter, definitionToValid } from '../utils/model.utils'
import { expandTypeStr, toTypeString } from '../utils/validate.utils'
import { checkInjection, getOpType } from '../utils/db.utils'
import { defaultPrimaryKey, defaultPrimaryType, MASK_STR, SQL_ID } from '../config/models.cfg'


const projectionFunctions = updateFunctions as any // valueType/funcType unable to easily index udpateFunctinos
export function projectedValue<T>(currentValue: T, update: UpdateValue<T>): T {
  if (typeof update !== 'object' || !update) return update

  const valueType = typeof currentValue,
    funcType = getOpType(update) as keyof typeof update | undefined

  if (funcType && typeof projectionFunctions[valueType]?.[funcType] === 'function')
    return projectionFunctions[valueType][funcType](currentValue, update[funcType])

  return update as T
}


/** Extract PrimaryID key from DefinitionSchema (Appending default value if missing) */
export function getPrimaryId<Def extends DefinitionSchema>(schema: Def, title = 'model', isChild = false) {

  let primaryId: keyof Def | undefined
  
  for (const key in schema) {
    if (!schema[key].isPrimary) continue
    if (primaryId) throw new Error(`${title} has more than one primary ID: ${String(primaryId)}, ${key}`)
    primaryId = key
  }

  if (!primaryId) {
    primaryId = isChild ? SQL_ID : defaultPrimaryKey
    schema[primaryId] = { type: defaultPrimaryType, ...(schema[primaryId] || {}), isPrimary: true }
  }

  return primaryId as PrimaryIDOf<Def>
}


/** Convert DefinitionSchema (from Model constructor) to DefinitionSchemaNormal (for Model.schema) */
export const adaptSchema = <Def extends DefinitionSchema>(schema: Def) => 
  Object.entries(schema).reduce(
    (result, [key, entry]) => ({ ...result, [key]: adaptSchemaEntry(entry) }),
    {} as DefinitionSchemaNormal<Def>
  )

/** Normalize a single Property's Definition */

export function adaptSchemaEntry<T extends DefType>(def: Definition<T>): DefinitionNormal<T> {

  if (typeof def.type === 'function') return {
    ...extendedTypeDefaults,
    ...def,
    typeBase: undefined,
    typeExtended: def.type,
  }

  const expanded = expandTypeStr(definitionToValid(def))

  const res = {
    ...def,
    ...expanded,
    db:   def.db   ?? (!expanded.isArray &&   dbFromType(expanded, def.isPrimary)),
    html: def.html ?? (!def.isPrimary    && htmlFromType(expanded)),
  }
  
  // Error checking
  if (res.isPrimary && (expanded.isArray || expanded.isOptional || !res.db))
    throw new Error(`SCHEMA ERROR - Primary ID must be serializable & in DB: ${res.db ? `"${def.type || toTypeString(expanded)}"` : 'db = false'}`)
  
  return res
}

/** Replace non-false Missing Adapters with Default Adapters */
export function buildAdapters<D extends DefinitionSchema, N extends DefinitionSchemaNormal<D>>
(adapters: Partial<AdapterDefinition<D>>, definition: N)
{

  Object.values(adapterTypes).forEach((adapterKey) => {
    // Add missing adapter objects, point to current adapter
    const adapterPtr = (adapters[adapterKey]
      ? adapters[adapterKey]
      : adapters[adapterKey] = {}
    ) as AdapterDefinitionLoose<D>[AdapterType] // Force loose typing to avoid TS errors

    // Fill in undefined adapters with defaults
    for (const key in definition) {
      if (adapterPtr[key] == null)
        adapterPtr[key] = getDefaultAdapter(adapterKey, definition[key])
    }
  })

  return adapters as AdapterDefinition<D>
}


/** Extract child definitions from parent DefinitionSchema */
export function extractChildren<D extends DefinitionSchema, N extends DefinitionSchemaNormal<D>>(schema: N, primaryId: keyof N) {
  return Object.entries(schema).reduce<ChildDefinitions<D>>(
    (arrayTables, [arrayName, def]) => {
      if (!def.typeBase || !def.isArray || def.db) return arrayTables

      return {
        ...arrayTables,

        [arrayName]: {
          [childLabel.foreignId]: stripPrimaryDef(schema[primaryId]),

          [childLabel.index]: adaptSchemaEntry({
            type: childIndexType,
            limits: def.limits && (def.limits.elem || def.limits.array) ? def.limits.array : def.limits,
          }),

          [childLabel.value]: adaptSchemaEntry({
            type: toTypeString({ ...def, isArray: false } as ValidationExpanded),
            limits: def.limits && (def.limits.elem || def.limits.array) ? def.limits.elem : undefined,
          }),
        }
      }
    },
    
    {}
  )
}

/** Check formatted Model schema for errors */
export function errorCheckModel(title: string, schema: DefinitionSchemaNormal) {
  checkInjection(title)
  checkInjection(schema, title)

  if (hasDupes(Object.keys(schema).map((k) => typeof k === 'string' ? k.toLowerCase() : k)))
    throw new Error(`Schema for ${title} contains duplicate property names: ${Object.keys(schema).join(', ')}`)
  
  if (!Object.values(schema).filter(({ db }) => db).length)
    throw new Error(`Schema for ${title} has no database entries.`)
}



/** Run selected adapters on schema data */
export async function runAdapters<D extends DefinitionSchema, A extends AdapterType>
  (adapterType: A, data: AdapterData<AdapterIn<D,A>>, model: AModel<D>): Promise<AdapterData<AdapterOut<D,A>>> {

  let result: any = adapterType === adapterTypes.toUI ? { [viewMetaKey]: {} } : {}

  await Promise.all(Object.entries(data).map(async ([key,val]) => {
  
    // Key contains Where logic
    if (isIn(key, whereLogic) || key === whereNot)
      return Array.isArray(val) ?
        Promise.all(val.map((d) => runAdapters(adapterType, d, model))) :
        runAdapters(adapterType, val ?? {}, model)

    // IF Key should not be in result
    if (adapterType === adapterTypes.fromDB && model.masked.includes(key))
      return result[key] = val ? MASK_STR : val
    
    // IF Key has no adapter
    const adapter = getVal(model.adapters[adapterType], key)
    if (typeof adapter !== 'function') return result[key] = val

    // IF Value contains an Update/Where operation
    const opKey = getOpType(val)
    const opVal = opKey ? val[opKey] : val
    
    // Run adapter & copy to result
    try {
      const adapterResult = await adapter(opVal, data, result)
      result[key] = opKey ? { [opKey]: adapterResult ?? opVal } : adapterResult ?? opVal
    
    // Catch any adapter errors - log errors & prevent crash on invalid values
    } catch (err: any) {
      err.name = `${key}.${adapterType}`
      logger.error(err)
    }
  }))

  // Sanitize toDB since keys are used directly in SQL commands
  return adapterType === adapterTypes.toDB ? sanitizeSchemaData(result, model) :
    adapterType === adapterTypes.fromDB ? caseInsensitiveObject(result) : // Fix for case-insensitive databases -- TODO: Integrate this into the loop above
      result
}


type AModel<Def extends DefinitionSchema> = Pick<Model<Def>, 'schema'|'masked'|'children'|'adapters'>