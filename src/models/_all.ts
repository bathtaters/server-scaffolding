import type { ModelBase } from '../../engine/models/Model'

import Base from './Base'
import Test from '../../engine/testing/Test.model'

// Add models here to connect to engine API/UI
// @ts-ignore -- TODO: Remove when Test extends ModelBase
const allModels: ModelBase[] = [ Base, Test ]
export default allModels