const errors = require('../config/errors.engine')
const logger = require('../libs/log')
const { models, modelsMax, allModelsKey, noModelAccessChar } = require('../config/users.cfg')

// Model is an object w/ Bit-maps stored as an Ints

const wrapAccess = (access) => `[${access}]`

exports.modelAccessToInts = (modelAccess) => {
  switch(typeof modelAccess) {
    case 'number':
      return modelAccess
    case 'string':
      if (!isNaN(modelAccess)) return +modelAccess
      if (modelAccess in models) return models[modelAccess]
      if (modelAccess.length === 1) {
        if (modelAccess === noModelAccessChar) return models.none
        const key = Object.keys(models).find((k) => k.charAt(0) === modelAccess)
        if (key) return models[key]
        throw errors.badAccess(`${modelAccess}`, 'modelAccessChar')
      }
      logger.warn(`Splitting up invalid modelString: ${modelAccess}`)
      modelAccess = [...modelAccess]
    case 'object':
      if (!Array.isArray(modelAccess))
        return Object.entries(modelAccess).reduce(
          (obj, [key,val]) => ({ ...obj, [key]: exports.modelAccessToInts(val) }), {})
      return modelAccess.reduce((int, str) => int | exports.modelAccessToInts(str), 0)
  }
  throw errors.badAccess(JSON.stringify(modelAccess), `modelAccess<${Array.isArray(modelAccess) ? 'array' : typeof modelAccess}>`)
}

exports.modelAccessStr = (modelInt) => {
  if (!modelInt) return noModelAccessChar
  // if (typeof modelInt === 'string' && !isNaN(modelInt)) modelInt = +modelInt
  if (typeof modelInt !== 'number' || modelInt < 0 || modelInt > modelsMax) {
    throw errors.badAccess(modelInt, 'modelAccessInt')
  }

  return Object.keys(models).filter((key) => models[key] & modelInt)
    .map((key) => key.charAt(0)).join('') || noModelAccessChar
}

exports.hasModelAccess = (modelObj, modelName, accessType = modelsMax) => {
  if (!modelObj) return false

  const modelsInt = typeof accessType === 'number' ? accessType : models[accessType] || 0

  if (modelName in modelObj) return modelObj[modelName] & modelsInt
  return modelObj[allModelsKey] & modelsInt
}

exports.modelsArrayToObj = (modelArr) => {
  let modelObj = {}
  modelArr.forEach((entry) => {
    const [model, access] = entry.split('-')
    if (!(access in models)) logger.warn('Invalid ModelsAccess key: '+access)
    else if (model in modelObj) modelObj[model] |= models[access]
    else modelObj[model] = models[access]
  })

  if (!(allModelsKey in modelObj)) modelObj[allModelsKey] = 0
  return modelObj
}

exports.getModelsString = (modelObj) => Object.entries(modelObj)
  .map(([key, int]) => `${key} ${wrapAccess(exports.modelAccessStr(int))}`).join(', ')
