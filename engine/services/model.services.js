const { parseTypeStr, dbFromType, htmlFromType, getAdapterFromType, setAdapterFromType } = require('../utils/model.utils')
const { hasDupes } = require('../utils/common.utils')
const { defaultPrimary, defaultPrimaryType, adapterKey } = require('../config/models.cfg')

function adaptSchemaEntry(settings) {
  if (!settings.type && settings.typeStr) parseTypeStr(settings)
  if (!settings.type && settings.isPrimary)
    Object.entries(defaultPrimaryType).forEach(([key,val]) => { settings[key] = val })
  if (!('db' in settings)) settings.db = dbFromType(settings)
  if (!settings.isPrimary && !('html' in settings)) settings.html = htmlFromType(settings)
  if (!(adapterKey.get in settings)) settings[adapterKey.get] = getAdapterFromType(settings)
  if (!(adapterKey.set in settings)) settings[adapterKey.set] = setAdapterFromType(settings)
  delete settings.isPrimary
}

exports.getPrimaryIdAndAdaptSchema = function (schema, title = 'model') {
  let primaryId

  Object.entries(schema).forEach(([key, settings]) => {
    if (settings.isPrimary) {
      if (primaryId) throw new Error(`${title} has more than one primary ID: ${primaryId}, ${key}`)
      primaryId = key
    }
    adaptSchemaEntry(settings)
  })

  if (!primaryId) {
    schema[defaultPrimary] = { ...defaultPrimaryType, ...(schema[defaultPrimary] || {}), isPrimary: true }
    delete schema[defaultPrimary].db
    adaptSchemaEntry(schema[defaultPrimary])
    primaryId = defaultPrimary
  }

  if (!Object.values(schema).filter(({ db }) => db).length)
    throw new Error(`DB schema for ${title} was unable to be created or has no entries.`)

  if (hasDupes(Object.keys(schema).map((k) => k.toLowerCase())))
    throw new Error(`Definitions for ${title} contain duplicate key names: ${Object.keys(schema).join(', ')}`)

  return primaryId
}


exports.runAdapters = async (adapterKey, data, schema, hideFields) => {
  if (typeof data !== 'object') return data
  await Promise.all(Object.keys(data).map(async (key) => {
    if (schema[key] && schema[key][adapterKey]) data[key] = await schema[key][adapterKey](data[key], data)
  }))
  hideFields && hideFields.length && hideFields.forEach((key) => { delete data[key] })
  return data
}
