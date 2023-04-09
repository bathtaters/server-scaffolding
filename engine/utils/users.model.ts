import BitMap, { BitMapInput, BitMapValue } from '../libs/BitMap'
import logger from '../libs/log'
import { isIn } from './common.utils'
import { badAccess } from '../config/errors.engine'
import { models, modelsStrings, allModelsKey, ModelsType, ModelObject } from '../types/Users.d'
import { allModels } from '../src.import'

const modelsBitMap = new BitMap(models, modelsStrings)
export default modelsBitMap

const defaultModelList = allModels.map(({ title }) => title)

// TODO: Make a multi-key BitMap class for this
// TODO: Add toJSON & fromJSON methods to both classes (Or however you automate JSON.stringify/parse)


/** Convert any modelAccess value to a BitMap or object of BitMaps */
export function modelAccessToInts(modelAccess: any): number | ModelObject<string> | undefined {
  if (modelAccess == null) return modelAccess

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
        return Object.entries(modelAccess).reduce<ModelObject<string>>(
          (obj, [key,val]) => {
            const newVal = modelAccessToInts(val)
            return typeof newVal === 'number' ?
              { ...obj, [key]: newVal } :
              { ...obj, ...newVal }
          },
          { [allModelsKey]: 0 }
        )
      
      // Array
      return modelAccess.reduce<BitMapValue<ModelsType>>(
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
export function modelsArrayToObj<Models extends string = string>
  (modelArray: string | string[], modelNames?: readonly Models[])
{
  if (typeof modelArray === 'string') modelArray = modelArray.charAt(0) === '[' ? JSON.parse(modelArray) : [modelArray]

  let modelObj = newModelObject<Models>(modelNames || defaultModelList as Models[])

  for (const entry of modelArray) {
    const [model, access] = entry.split('-')
    if (!isIn(model, modelObj) || !isIn(access, models)) logger.warn(`Invalid model access entry: ${entry}`)
    else
      // @ts-expect-error -- TODO: Replace with BitMap
      modelObj[model] |= models[access]
  }
  return modelObj
}


/** Determine if modelName has access to all accessTypes provided */
export function hasModelAccess<Models extends string>(
  modelObj?: ModelObject<Models>,
  modelName?: Models,
  accessType: BitMapInput<ModelsType> = modelsBitMap.max
) {
  return !modelObj || !modelName ? false : modelsBitMap.create(accessType).isSubset(
    modelsBitMap.create(modelObj[modelName] ?? modelObj[allModelsKey])
  )
}


/** Convert modelsObject into a comma-seperated list: "model [rw], name [-]" */
export const getModelsString = <Models extends string>(modelObj: ModelObject<Models> = { [allModelsKey]: 0 }) =>
  Object.entries(modelObj).map(
    ([key, int]) => `${key} ${wrapAccess(modelsBitMap.create(int).string)}`
  ).join(', ')



// HELPERS

const wrapAccess = (access: string) => `[${access}]`

const newModelObject = <Models extends string>(modelList: readonly Models[]) =>
  [...modelList, allModelsKey]
    .reduce((o,m) => ({ ...o, [m]: 0 }), {} as ModelObject<Models>)