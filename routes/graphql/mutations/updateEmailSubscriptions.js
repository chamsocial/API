const { AuthenticationError } = require('apollo-server-koa')
const { GroupUser } = require('../../../models')


async function updateEmailSubscriptions(_, { settings }, { me }) {
  if (!me) throw new AuthenticationError('You must be logged in.')
  await GroupUser.destroy({ where: { user_id: me.id } })
  const groups = settings.map(setting => ({
    group_id: setting.groupId,
    user_id: me.id,
    type: setting.type,
  }))
  await GroupUser.bulkCreate(groups)
  return true
}


module.exports = updateEmailSubscriptions
