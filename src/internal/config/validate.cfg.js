const RegEx = require('../libs/regex')
const strictDatetime = true // Use strict date/time parsing

module.exports = {
  ignoreDisableMin: ['float'], // never remove 'min' for these types (intended for helping searches)

  boolOptions: {
    true:  [true,  1, '1', 'true', 'yes',  'on'],
    false: [false, 0, '0', 'false', 'no', 'off', ''],
    types: ['string', 'number', 'boolean'],
    loose: true, // case-insensitive & convert using Boolean() [false: anything not in 'false' => true]
  },

  dateOptions: {
    date: { format: 'YYYY-MM-DD', strict: strictDatetime, delimiters: ['-'] },
    time: { strict: strictDatetime, strictSeparator: strictDatetime },
  },

  illegalKeyName: RegEx(/[^a-zA-Z0-9_]/), // match illegal characters for KEY names

  errorMsgs: {
    // Static
    exists:   () => 'must be included',
    b64:      () => 'not a valid base64 string',
    uuid:     () => 'not a valid UUID',
    hex:      () => 'not a valid hexadecimal',
    string:   () => 'not a valid string',
    float:    () => 'not a valid decimal',
    int:      () => 'not a valid number',
    boolean:  () => 'not a valid boolean',
    interval: () => 'not a valid interval',
    datetime: () => 'not a valid timestamp',
    date:     () => 'not a valid date',
    object:   () => 'not a valid object',
    array:    () => 'not a valid array',
    // Variable
    type:      (type)      => `does not exist as ${type}`,
    missing:   (key, type) => `${key} has ${type ? 'invalid' : 'missing'} type definition: ${type || ''}`,
    missingIn: (key)       => `${key} missing 'in' array for validation`,
    limit:     ({ min, max }, type) => 
      `must be ${type ? type+' ' : ''}${min != null && max != null ? 
          `between ${min} & ${max}` : `${!max ? 'more' : 'less'} than ${min || max}`
      }${type === 'string' ? ' characters' : type === 'array' ? ' items' : ''}`,
  },
}