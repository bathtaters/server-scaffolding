import Model from '../../engine/models/Model'
import BitMapFactory from '../../engine/libs/BitMap'
import { formEffects } from '../../engine/types/gui'

/* -- Model Definition (Shared by Simple & Advanced models) -- */
const baseDefinition = {
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

    // Add a Tooltip to the GUI
    description: "Test field, enter any text",
  },

  extended: {
    // Use an extended type class (BitMap type is provided, or make your own)
    type: BitMapFactory(['a','b','c']),

    // Default can be a generator function
    default: () => 'a',

    // Use a special effect in the form
    formEffect: formEffects.hidden
  },
  
  demoArray: {
    // Array type
    type: "string[]",

    // Array size / Element num/char limits
    limits: { array: { max: 5 }, elem: { max: 100 } },
  },
} as const


/* --- Simple Model --- */
export default new Model('base', baseDefinition)


/* --- Advanced Model --- *\
const baseTitle = 'base'

class BaseModel extends Model<typeof baseDefinition, typeof baseTitle> {
  newProp: string

  constructor() {
    super(baseTitle, baseDefinition)

    // Additional initialization
    this.newProp = 'NEW'
  }

  override create(overwrite?: boolean) {
    // Override built-in method (Must have same signature)
    return super.create(overwrite)
  }

  helper() {
    // Add new method
    return null
  }
}

export default new BaseModel()
//*/