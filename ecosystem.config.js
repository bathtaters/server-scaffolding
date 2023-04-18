const pkg = require('./package.json')
const { dev_instances, ...serverCfg } = require('./engine/config/pm2.cfg.json')

const prodOptions = {
  name             : pkg.name,
  script           : pkg.main,
  cwd              : "./",
  args             : [],
  node_args        : [],
  instances        : 1,
  exec_interpreter : "node",
  exec_mode        : "fork",
  autorestart      : false,
  watch            : false,
  vizion           : false,
  merge_logs       : true,
  error_file       : "/dev/null",
  out_file         : "/dev/null",
  ...serverCfg,
}

const devOptions = {
  ...prodOptions,
  instances        : dev_instances ?? 1,
}

require('dotenv').config()
module.exports = {
  apps : [process.env.NODE_ENV === 'production' ? prodOptions : devOptions],
}