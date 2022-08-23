const pkg = require('./package.json')
const serverCfg = require('./engine/config/server.cfg')

const prodOptions = {
  name             : pkg.name,
  cwd              : "./",
  args             : [],
  script           : pkg.main,
  node_args        : ["--harmony", "--stack-size=1024"],
  instances        : serverCfg.processCount,
  exec_interpreter : "node",
  exec_mode        : serverCfg.isCluster ? "cluster" : "fork",
  autorestart      : true,
  stop_exit_codes  : [0],
  max_restarts     : 10,
  max_memory_restart:"150M",
  min_uptime       : "90s",
  restart_delay    : 100,
  kill_timeout     : serverCfg.gracefulExitOptions.suicideTimeout + 100,
  exp_backoff_restart_delay: "100",
  watch            : false,
  vizion           : false,
  merge_logs       : true,
  log_date_format  : "YY-MM-DD HH:mm",
  error_file       : "/dev/null",
  out_file         : "/dev/null",
}

const devOptions = {
  ...prodOptions,
  instances        : 2,
}

require('dotenv').config()
module.exports = {
  apps : [process.env.NODE_ENV === 'production' ? prodOptions : devOptions],
}