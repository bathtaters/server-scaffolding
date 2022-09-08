const { parseTypeStr, dbFromType, htmlFromType, getAdapterFromType, setAdapterFromType } = require('../utils/model.utils')
const { hasDupes } = require('../utils/common.utils')
const { defaultPrimary, defaultPrimaryType, adapterKey, arrayLabel, SQL_ID } = require('../config/models.cfg')

function adaptSchemaEntry(settings) {
  if (!settings.type && settings.typeStr) parseTypeStr(settings)
  if (!settings.type && settings.isPrimary)
    Object.entries(defaultPrimaryType).forEach(([key,val]) => { settings[key] = val })
  if (!('db' in settings) && !settings.isArray) settings.db = dbFromType(settings)
  if (!settings.isPrimary && !('html' in settings)) settings.html = htmlFromType(settings)
  if (!(adapterKey.get in settings)) settings[adapterKey.get] = getAdapterFromType(settings)
  if (!(adapterKey.set in settings)) settings[adapterKey.set] = setAdapterFromType(settings)
  delete settings.isPrimary

  if (settings.isHTML && (settings.type !== 'string' || !settings.hasSpaces))
    throw new Error(`Schema cannot have non-string* HTML. Type: ${settings.typeStr || settings.type}`)
  return settings
}

exports.getPrimaryIdAndAdaptSchema = function (schema, title = 'model', isArray = false) {
  let primaryId

  Object.entries(schema).forEach(([key, settings]) => {
    if (settings.isPrimary) {
      if (primaryId) throw new Error(`${title} has more than one primary ID: ${primaryId}, ${key}`)
      if (settings.isArray) throw new Error(`Array cannot be primary ID: ${title}.${key}`)
      primaryId = key
    }
    adaptSchemaEntry(settings)
  })

  if (!primaryId) {
    primaryId = isArray ? SQL_ID : defaultPrimary
    schema[primaryId] = { ...defaultPrimaryType, ...(schema[primaryId] || {}), isPrimary: true }
    delete schema[primaryId].db
    adaptSchemaEntry(schema[primaryId])
  }

  if (!Object.values(schema).filter(({ db }) => db).length)
    throw new Error(`DB schema for ${title} was unable to be created or has no entries.`)

  if (hasDupes(Object.keys(schema).map((k) => k.toLowerCase())))
    throw new Error(`Definitions for ${title} contain duplicate key names: ${Object.keys(schema).join(', ')}`)

  return primaryId
}


exports.runAdapters = async (adapterType, data, { schema, hidden }) => {
  if (typeof data !== 'object') return data
  await Promise.all(Object.keys(data).map(async (key) => {
    if (schema[key] && schema[key][adapterType])
      data[key] = await schema[key][adapterType](data[key], data)
  }))
  adapterType === adapterKey.get && hidden && hidden.length && hidden.forEach((key) => { delete data[key] })
  return data
}


const getIndexDef = ({ limits }) => adaptSchemaEntry({
  typeStr: 'int',
  limits: limits && (limits.elem || limits.array) ? limits.array : limits,
})

const stripArrayDef = ({ typeStr, limits, isHTML }) => adaptSchemaEntry({
  isHTML,
  typeStr: (typeStr || definition.type).replace('[]',''),
  limits: limits && (limits.elem || limits.array) ? limits.elem : undefined
})

const stripPrimaryDef = ({ db, isPrimary, isOptional, ...definition }) => ({
  ...definition, db: (db || '').replace(' PRIMARY KEY', ' NOT NULL')
})

exports.extractArrays = (schema, idDefinition) => Object.entries(schema).reduce((arrays, [key, def]) => 
  !def.isArray || def.db ? arrays : Object.assign(arrays, { [key]: {
    [arrayLabel.foreignId]: stripPrimaryDef(idDefinition),
    [arrayLabel.index]:     getIndexDef(def),
    [arrayLabel.entry]:     stripArrayDef(def),
  }})
, {})