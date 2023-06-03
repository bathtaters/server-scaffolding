import type { GenericModel } from '../../engine/models/Model'
import Test from '../../engine/testing/Test.model'
import Base from './Base'

/** List of models connected to engine API/UI */
const allModels = [
    Base,
    Base.getChildModel('demoArray'), // add child model to GUI/API
    // Test, // view model used for Tests
]

/** Names of Models connected to GUI/API */
export type ModelTitle = typeof allModels[number]['title']

export default allModels as GenericModel[]