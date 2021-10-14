const DataLoader = require('dataloader')
const {
  GroupUser, Op, MessageSubscriber, User, Sequelize, sequelize,
} = require('../../models')

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


const getUser = new DataLoader(ids => (
  User.findAll({
    where: { id: { [Op.in]: ids } },
    order: [[Sequelize.fn('FIELD', Sequelize.col('id'), ...ids)]],
  })
))

const getBookmarkedAt = new DataLoader(async ids => {
  const postIds = ids.map(id => id.postId)
  const { userId } = ids[0]
  const dates = await sequelize.query(
    'SELECT post_id, created_at FROM bookmarks WHERE user_id = :userId AND post_id IN(:postIds)',
    {
      replacements: { userId, postIds },
      type: sequelize.QueryTypes.SELECT,
    },
  )
  const results = ids.map(({ postId }) => {
    const date = dates.find(d => d.post_id === postId)
    return date ? date.created_at : null
  })
  return results
})


module.exports = {
  emailSubscriptions,
  messageThreadUsers,
  getBookmarkedAt,
  getUser,
}
