const { GraphQLError } = require('graphql')
const { MessageSubscriber, Message, MessageThread } = require('../../../models')
const { cleanContent } = require('../../../utils/content')


const messageMutations = {
  async message(_, { users, subject, message }, { me }) {
    if (!me) throw new GraphQLError('You must be logged in.')
    const validUsers = (users && users.length > 0)
    const sendingToSelf = users.find(userId => String(userId) === String(me.id))
    const validSubject = subject.length > 2
    const validMessage = message.length > 2
    if (!validUsers || !validSubject || !validMessage || sendingToSelf) {
      throw new GraphQLError('INVALID_INPUT', {
        errors: [{ message: 'Subject and message must be minimum of 3 char and min 1 user' }],
      })
    }

    const thread = await MessageThread.create({ subject })
    await Message.create({ thread_id: thread.id, user_id: me.id, message: cleanContent(message) })
    const subscribers = users.map(userId => ({ thread_id: thread.id, user_id: userId, seen: null }))
    subscribers.push({ thread_id: thread.id, user_id: me.id, seen: new Date() })
    await MessageSubscriber.bulkCreate(subscribers)
    return { id: thread.id }
  },

  async messageReply(_, { threadId, message }, { me }) {
    if (!me) throw new GraphQLError('You must be logged in.')
    const isSubscriber = await MessageSubscriber.findOne({
      where: { user_id: me.id, thread_id: threadId },
    })
    if (!isSubscriber) throw new GraphQLError('You don\'t beling to this message thread.')

    return Message.create({ thread_id: threadId, user_id: me.id, message: cleanContent(message) })
  },
}


module.exports = messageMutations
