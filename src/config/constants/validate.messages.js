// Validation Error Messages
module.exports = {
  // Static
  exists:   'must be included',
  uuid:     'not a valid UUID',
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
    `is too ${isStr ? 'long/short' : 'large/small'} (must be between ${min} & ${max}${isStr ? ' characters' : ''})`,
}