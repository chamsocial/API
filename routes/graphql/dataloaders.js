const DataLoader = require('dataloader')
const { GroupUser, Op, MessageSubscriber, User } = require('../../models')

const emailSubscriptions = new DataLoader(async ids => {
  const { userId } = ids[0]
  const groupIds = ids.map(id => id.groupId)
  const groups = await GroupUser.findAll({
    where: { group_id: { [Op.in]: groupIds }, user_id: userId },
  })
  const sorted = groupIds.map(id => {
    const group = groups.find(g => g.group_id === id)
    if (!group) return 'none'
    return group.type
  })
  return sorted
})


const messageThreadUsers = new DataLoader(async ids => {
  const subscribers = await MessageSubscriber.findAll({
    where: { thread_id: { [Op.in]: ids } },
    include: [{
      model: User,
    }],
  })

  return ids.map(threadId => (
    subscribers
      .filter(s => s.thread_id === threadId)
      .map(s => s.User)
  ))
})


module.exports = {
  emailSubscriptions,
  messageThreadUsers,
}
