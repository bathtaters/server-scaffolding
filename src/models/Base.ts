import Model from '../../engine/models/Model'

/* --- Simple Model --- */
export default new Model('base', {
  // Layout of Database object
  id: {
    // .id is automatically added as int primary key
    type: "int",
    isPrimary: true,
  },
  data: {
    //  Values: string|uuid|b64(url)|hex|date|datetime|boolean|int|float|object|any
    //  Suffix: [] = array of, ? = optional
    //  string* = allow symbols/spaces
    type: "string*",

    // Standard Num/Char limits
    limits: { min: 0, max: 1000 },
    

    // Default value (used when adding entry if no value provided)
    default: "DEFAULT VALUE",
  },
  demoArray: {
    // Array type
    type: "string[]",

    // Array size / Element num/char limits
    limits: { array: { max: 5 }, elem: { max: 100 } },
  },
})

// TODO -- Test that this works w/ new Types
/* --- Advanced Model --- *\
import { Feedback } from '../../engine/models/Model.d'

class BaseModel extends Model<Base> {
  newProp: string

  constructor() {
    super('base', {
      data: {
        type: "string*",
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