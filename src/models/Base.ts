import type { Base } from './Base.d'
import Model from '../../engine/models/Model'

/* --- Simple Model --- */
export default new Model<Base>('base', {
  // Layout of Database object
  id: {
    // .id is automatically added as int primary key
    typeStr: "int",
    isPrimary: true,
  },
  data: {
    //  Values: string|uuid|b64(url)|hex|date|datetime|boolean|int|float|object|any
    //  Suffix: [] = array of, ? = optional
    //  string* = allow symbols/spaces
    typeStr: "string*",

    // Standard Num/Char limits
    limits: { min: 0, max: 1000 },
    // Array size / Element num/char limits = { array: { min: 1, max: 10 }, elem: { min: 4, max: 100 } },

    // Default value (used when adding entry if no value provided)
    default: "DEFAULT VALUE",
  },
})


/* --- Advanced Model --- *\
import { Feedback } from '../../engine/models/Model.d'

class BaseModel extends Model<Base> {
  newProp: string

  constructor() {
    super('base', {
      data: {
        typeStr: "string*",
        limits: { min: 0, max: 1000 },
        default: "DEFAULT VALUE",
      },
    })

    // Additional initialization
    this.newProp = 'NEW'
  }

  create(overwrite?: boolean): Promise<Feedback> {
    // Override built-in method
    return super.create(overwrite)
  }

  helper() {
    // Add new method
    return null
  }
}

export default new BaseModel()
//*/