const pm2 = require('pm2')

exports.connect = () => new Promise((res, rej) => { pm2.connect((err) => err ? rej(err) : res()) })

exports.disconnect = () => new Promise((res, rej) => { pm2.disconnect((err) => err ? rej(err) : res()) })

exports.list = () => new Promise((res, rej) => { pm2.list((err, list) => err ? rej(err) : res(list)) })

exports.restart = (procId, updateEnv = true) => new Promise((res, rej) => {
  pm2.restart(procId, { updateEnv }, (err) => err ? rej(err) : res())
})