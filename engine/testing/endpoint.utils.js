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

exports.createUser = (userSettings = {}) => Users.add(userSettings)

exports.getApiHeader = (settings = {}) =>
  exports.createUser({ username: 'test', access: ['api'], ...settings })
    .then(({ token }) => ({ Authorization: `Bearer ${token}` }))