// Validation Error Messages
module.exports = {
  // Static
  exists:   'must be included',
  b64:      'not a valid base64 string',
  uuid:     'not a valid UUID',
  hex:      'not a valid hexadecimal',
  string:   'not a valid string',
  float:    'not a valid decimal',
  int:      'not a valid number',
  boolean:  'not a valid boolean',
  interval: 'not a valid interval',
  datetime: 'not a valid timestamp',
  date:     'not a valid date',
  object:   'not a valid object',
  // Variable
  type:      (type)      => `does not exist as ${type}`,
  missing:   (key, type) => `${key} has ${type ? 'invalid' : 'missing'} type definition: ${type || ''}`,
  missingIn: (key)       => `${key} missing 'in' array for validation`,
  limit:     ({ min, max }, isStr = false) => 
    `is too ${
      isStr ? 'long/short' : 'large/small'
    } (must be between ${
      min || 'anything'} & ${max || 'anything'}${isStr ? ' characters' : ''
    })`,
}