import type { GenericModel } from '../../engine/models/Model'

import Base from './Base'
// import Test from '../../engine/testing/Test.model'

// Add models here to connect to engine API/UI
// TODO: Create a generic 'Model' type that works, add 'Test' back in
const allModels: GenericModel[] = [
    // @ts-ignore
    Base,
    // Base.getChildModel('demoArray') as any, // add child model to GUI/API
]

export default allModels