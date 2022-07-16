const allModels = require('../../models/_all')
const Users = require('../models/Users')

exports.getModelTestData = (idx = 0) => {
  const Model = allModels[idx]
  if (!Model) throw new Error('No model w/ a non-primary key exists for testing!')

  const testKey = Object.keys(Model.schema).find((key) => key !== Model.primaryId && ['TEXT', 'INTEGER'].includes(Model.schema[key]))
  if (!testKey) return exports.getModelTestData(idx + 1)

  return {
    Model,
    testKey,
    testIsInt: Model.schema[testKey] === 'INTEGER',
    idKey: Model.primaryId,
    apiPrefix: '/api/' + Model.title,
    guiPrefix: '/gui/db/' + Model.title,
  }
}

exports.updateUser = (userInfo, newInfo) =>
  Users.update(userInfo.id, newInfo).then(() =>
    Users.get(userInfo.id).then((data) =>
      Object.entries(data).forEach(([key,val]) => {
        userInfo[key] = val
      })
    )
  )

exports.createUser = async (userSettings = {}) => {
  const id = await Users.add(userSettings)
  return Users.get(id)
}

exports.getApiHeader = (settings = {}) =>
  exports.createUser({ username: 'test', access: ['api'], ...settings })
    .then(({ token }) => ({ Authorization: `Bearer ${token}` }))

exports.deepCopy = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(exports.deepCopy)
  return Object.entries(obj).reduce((copy, [key,val]) =>
    Object.assign(copy, { [key]: exports.deepCopy(val) })
  , {})
}

exports.expectEnvWrite = (writeFileSpy, envObj) => Object.entries(envObj).forEach(([key,val]) => {
  expect(writeFileSpy).toBeCalledWith(
    expect.any(String),
    expect.stringContaining(`${key}=${val}\n`)
  )
})