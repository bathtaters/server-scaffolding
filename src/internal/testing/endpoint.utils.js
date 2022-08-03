const Users = require('../models/Users')
const Test = require('./Test.model')

exports.testModelData = {
  Model: Test, testKey: 'name', idKey: Test.primaryId,
  prefix: { api: '/api/test', gui: '/gui/db/test' },
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