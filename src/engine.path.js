const { join } = require('path')
module.exports = {
  base:       join(__dirname, '../engine/'),
  libs:       join(__dirname, '../engine/libs/'),
  middleware: join(__dirname, '../engine/middleware/'),
  utils:      join(__dirname, '../engine/utils/common.utils'),
  config:     join(__dirname, '../engine/config/'),
  testing:    join(__dirname, '../engine/testing/'),
  modelPath:  join(__dirname, '../engine/models/Model'),
}