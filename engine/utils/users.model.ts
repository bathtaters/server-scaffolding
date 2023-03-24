import BitMap, { BitMapInput, BitMapValue } from '../libs/BitMap'
import logger from '../libs/log'
import { isIn } from './common.utils'
import { badAccess } from '../config/errors.engine'
import { models, modelsStrings, allModelsKey, ModelsTypes, ModelObject } from '../types/Users.d'

const modelsBitMap = new BitMap(models, modelsStrings)
export default modelsBitMap

// TODO: Auto-populate modelNames w/ models/_all


/** Convert any modelAccess value to a BitMap or object of BitMaps */
export function modelAccessToInts(modelAccess: any): number | Record<string,number> {
  switch(typeof modelAccess) {
    case 'number':
      return modelsBitMap.create(modelAccess).int

    case 'string':
      // Numeric string
      if (!isNaN(+modelAccess)) return modelsBitMap.create(+modelAccess).int
      // Model access full name
      if (isIn(modelAccess, models)) return modelsBitMap.create(modelAccess).int
      // Model access string
      if (modelAccess && modelsBitMap.isValidString(modelAccess))
        return modelsBitMap.fromString(modelAccess).int

      throw badAccess(`${modelAccess}`, 'modelAccessChar')
      // logger.warn(`Splitting up invalid modelString: ${modelAccess}`)
      // modelAccess = [...modelAccess]
      
    case 'object':
      // Object
      if (!Array.isArray(modelAccess))
        return Object.entries(modelAccess).reduce<Partial<ModelObject<string>>>(
          (obj, [key,val]) => {
            const newVal = modelAccessToInts(val)
            return typeof newVal === 'number' ?
              { ...obj, [key]: newVal } :
              { ...obj, ...newVal }
          },
          {}
        )
      
      // Array
      return modelAccess.reduce<BitMapValue<ModelsTypes>>(
        (bit, str) => {
          const newVal = modelAccessToInts(str)
          if (typeof newVal === 'number') return bit.add(newVal)
          logger.warn(`Nested object ignored in modelAccess: ${JSON.stringify(modelAccess)}`)
          return bit
        },
        modelsBitMap.create()
      ).int
  }

  throw badAccess(JSON.stringify(modelAccess), `modelAccess<${Array.isArray(modelAccess) ? 'array' : typeof modelAccess}>`)
}


/** Convert models of form '["model-read","name-none","model-write"]' to Models Object */
export function modelsArrayToObj<Models extends string>(modelArray: string[], modelNames: readonly Models[]) {
  let modelObj = newModelObject(modelNames)

  for (const entry of modelArray) {
    const [model, access] = entry.split('-')
    if (!isIn(model, modelObj) || !isIn(access, models)) logger.warn(`Invalid model access entry: ${entry}`)
    else
      modelObj[model].add(access)
  }
  return modelObj
}


/** Determine if modelName has access to all accessTypes provided */
export function hasModelAccess<Models extends string>(
  modelObj?: ModelObject<Models>, modelName?: Models, accessType: BitMapInput<ModelsTypes> = modelsBitMap.max
) {
  return !modelObj || !modelName ? false : modelsBitMap.create(accessType).isSubset(
    modelsBitMap.create(modelObj[modelName] ?? modelObj[allModelsKey])
  )
}


/** Convert modelsObject into a comma-seperated list: "model [rw], name [-]" */
export const getModelsString = <Models extends string>(modelObj: ModelObject<Models>) =>
  Object.entries(modelObj).map(
    ([key, int]) => `${key} ${wrapAccess(modelsBitMap.create(int).string)}`
  ).join(', ')



// HELPERS

const wrapAccess = (access: string) => `[${access}]`

const newModelObject = <Models extends string>(modelList: readonly Models[]) => [...modelList, allModelsKey]
  .reduce((o,m) => ({ ...o, [m]: modelsBitMap.create() }), {} as ModelObject<Models>)