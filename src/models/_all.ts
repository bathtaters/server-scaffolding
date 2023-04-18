import type { ModelBase } from '../../engine/models/Model'

import Base from './Base'
// import Test from '../../engine/testing/Test.model'

// Add models here to connect to engine API/UI
// @ts-ignore -- TODO: Create a generic 'Model' type that works, add 'Test' back in
const allModels: ModelBase[] = [
    Base,
]

export default allModels