import type { GenericModel } from '../../../engine/models/Model'
import Test from '../../../engine/testing/Test.model'

/** List of models connected to engine API/UI */
const allModels = [ Test ]

/** Names of Models connected to GUI/API */
export type ModelTitle = typeof allModels[number]['title']

export default allModels as GenericModel[]