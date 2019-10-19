const { AuthenticationError, ForbiddenError } = require('apollo-server-koa')
const {
  Post, User, GroupContent, sequelize,
} = require('../../models')

const queries = {
  me: (_, args, { me }) => me,


  posts: async (_, { limit: limitInput = 10, page = 1 }) => {
    const limit = limitInput < 100 ? limitInput : 100
    const offset = limitInput * (page - 1)
    const posts = await Post.findAll({
      where: { status: 'published' },
      limit,
      offset,
      order: [['created_at', 'DESC']],
    })
    return { list: posts }
  },
  postsInfo: async () => ({
    count: await Post.count({ where: { status: 'published' } }),
  }),
  post: (_, { slug }) => (
    Post.findOne({ where: { slug, status: 'published' } })
      .then(post => {
        if (!post) throw new Error('No post found!')
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


  user: (_, { slug }) => User.findOne({ where: { slug } }),
}

module.exports = queries
