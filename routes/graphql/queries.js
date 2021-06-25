const _ = require('lodash')
const { AuthenticationError, ForbiddenError, ApolloError } = require('apollo-server-koa')
const {
  Post, User, GroupContent, sequelize, Sequelize,
  Message, MessageSubscriber, MessageThread, Op,
} = require('../../models')
const redis = require('../../config/redis')


const queries = {
  me: (parent, args, { me }) => me,
  resetPassword: async (parent, { token }) => {
    const userId = await redis.get(`forgot:${token}`)
    if (!userId) return null
    const user = await User.findByPk(userId)
    return user.username
  },


  posts: async (parent, {
    postsPerPage = 20, page = 1, groupId, search,
  }, context) => {
    const limit = postsPerPage < 100 ? postsPerPage : 100
    const offset = limit * (page - 1)
    const where = { status: 'published' }
    if (groupId) where.group_id = groupId
    if (search) {
      const escaped = sequelize.escape(search)
      where[Op.and] = sequelize.literal(`MATCH (title,content) AGAINST (${escaped})`)
      where.created_at = {
        [Op.gte]: Sequelize.literal('DATE_SUB(NOW(), INTERVAL 5 YEAR)'),
      }
    }
    const attributes = Post.publicFields
    attributes.push('user_id', 'group_id')
    attributes.push(Post.hasMediaAttribute)

    context.postListWhere = where
    const posts = await Post.findAll({
      attributes,
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      // logging: console.log,
    })
    return { list: posts }
  },
  post: (parent, { slug }) => (
    Post.findOne({ where: { slug, status: 'published' } })
      .then(post => {
        if (!post) throw new ApolloError('NO_POSTS_FOUND')
        return post
      })
  ),
  postMedia: async (parent, { postId }) => {
    const post = await Post.findByPk(postId)
    return post.getMedia()
  },


  drafts(parent, args, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    return Post.findAll({
      where: { user_id: me.id, status: 'draft' },
      limit: 10,
      order: [['created_at', 'DESC']],
    })
  },
  draft: async (parent, { postId }, { me }) => {
    if (!me) throw new AuthenticationError('You must be logged in.')
    const post = await Post.findOne({ where: { id: postId, user_id: me.id } })
    if (!post) throw new ForbiddenError('No draft exist!')
    return post
  },


  groups: async () => {
    const groups = await sequelize.query(
      `
        SELECT
          groups_content.*,
          (SELECT COUNT(*) FROM posts WHERE posts.group_id = groups_content.group_id) AS postCount
        FROM groups_content
        WHERE lang = 'en'
        AND slug != 'postmaster'
        ORDER BY postCount DESC
      `,
      { type: sequelize.QueryTypes.SELECT },
    )
    return groups
  },
  group: (parent, { slug }) => GroupContent.findOne({ where: { slug: String(slug) } }),


  user: (parent, { slug }) => User.findOne({ where: { slug } }),
  userSearch: (parent, { search }, { me }) => (
    User.findAll({
      where: {
        id: { [Op.ne]: me.id },
        username: { [Op.like]: `%${search}%` },
      },
      limit: 10,
      attributes: ['id', 'username'],
    })
  ),


  messages: async (parent, args, { me }) => {
    if (!me) throw new AuthenticationError('You must be logged in.')

    const messages = await MessageThread.findAll({
      include: [{
        model: Message,
        where: Sequelize.literal('Messages.created_at = (SELECT MAX(created_at) FROM messages WHERE thread_id = MessageThread.id)'),
      }, {
        model: MessageSubscriber,
        where: { user_id: me.id },
      }],
      order: [
        [Message, 'created_at', 'DESC'],
      ],
      // logging: sql => console.log('*** SQL: ', sql),
    })

    return messages
  },
  messageThread: async (parent, { threadId }, { me }) => {
    if (!me) throw new AuthenticationError('You must be logged in.')

    const thread = await MessageThread.findOne({
      where: { id: threadId },
      include: [{
        model: MessageSubscriber,
        where: { user_id: me.id },
      }, {
        model: Message,
      }],
    })
    if (!thread) throw new ApolloError('No message thread found')

    const user = _.get(thread, 'MessageSubscribers[0]')
    if (user) await user.update({ seen: new Date() })

    return thread
  },


  notifications: async (parent, args, { me }) => {
    if (!me) return []

    const messages = await MessageThread.findAll({
      where: {},
      include: [
        { model: Message, attributes: [] },
        {
          model: MessageSubscriber,
          where: {
            user_id: me.id,
            [Op.and]: {
              [Op.or]: [
                sequelize.literal('Messages.created_at > MessageSubscribers.seen'),
                { seen: null },
              ],
            },
          },
          attributes: [],
        },
      ],
      group: ['id'],
    })

    if (messages.length <= 0) return []

    return messages.map(message => ({
      id: `thread-${message.id}`,
      type: 'message',
      typeId: message.id,
      title: `New message in "${_.truncate(message.subject)}"`,
    }))
  },
}

module.exports = queries
