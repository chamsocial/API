const { AuthenticationError, ForbiddenError, ApolloError } = require('apollo-server-koa')
const {
  Post, User, GroupContent, sequelize, Sequelize,
  Message, MessageSubscriber, MessageThread, Op,
} = require('../../models')

const queries = {
  me: (_, args, { me }) => me,


  posts: async (_, { postsPerPage = 20, page = 1, groupId }, context) => {
    const limit = postsPerPage < 100 ? postsPerPage : 100
    const offset = limit * (page - 1)
    const where = { status: 'published' }
    if (groupId) where.group_id = groupId

    context.postListWhere = where
    const posts = await Post.findAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
    })
    return { list: posts }
  },
  post: (_, { slug }) => (
    Post.findOne({ where: { slug, status: 'published' } })
      .then(post => {
        if (!post) throw new ApolloError('NO_POSTS_FOUND')
        return post
      })
  ),
  postMedia: async (_, { postId }) => {
    const post = await Post.findByPk(postId)
    return post.getMedia()
  },


  drafts(_, args, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    return Post.findAll({
      where: { user_id: me.id, status: 'draft' },
      limit: 10,
      order: [['created_at', 'DESC']],
    })
  },
  draft: async (_, { postId }, { me }) => {
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
  group: (_, { slug }) => GroupContent.findOne({ where: { slug: String(slug) } }),


  user: (_, { slug }) => User.findOne({ where: { slug } }),
  userSearch: (_, { search }) => (
    User.findAll({
      where: { username: { [Op.like]: `%${search}%` } },
      limit: 10,
      attributes: ['id', 'username'],
    })
  ),


  messages: async (_, args, { me }) => {
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
  messageThread: async (_, { threadId }, { me }) => {
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

    return thread
  },
}

module.exports = queries
