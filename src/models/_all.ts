import type { GenericModel } from '../../engine/models/Model'
import Base from './Base'
// import Test from '../../engine/testing/Test.model' // TODO: Migrate tests

/** List of models connected to engine API/UI */
const allModels /*: GenericModel[] */ = [
    Base,
    Base.getChildModel('demoArray'), // add child model to GUI/API
] as const

// @ts-ignore -- TODO: Create a generic 'Model' type that works, add 'Test' back in
export default allModels as GenericModel[]

/** Name of any Model connected to GUI/API */
export type ModelTitle = typeof allModels[number]['title']