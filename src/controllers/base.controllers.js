const base = require('../models/Base')

let baseId
base.create(true).then(() => 
  base.add({ data: 'Sample data' }).then((id) => { if (id) baseId = id })
)
async function sample(_,res) {
  return base.get(baseId).then(res.send)
}

async function get(req,res) {
  const data = base.get(req.param.id)
  if (!data) throw new Error(`${req.param.id} not found.`)
  return res.send(data)
}

async function set(req,res) {
  if (!req.body) throw new Error(`No data specified.`)
  const id = base.add(req.body)
  if (!id) throw new Error(`New base unable to be created.`)
  return res.send({ id })
}

module.exports = { sample, get, set }