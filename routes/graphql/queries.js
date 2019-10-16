const { AuthenticationError, ForbiddenError } = require('apollo-server-koa')
const {
  Post, User, GroupContent, GroupUser,
} = require('../../models')

const queries = {
  me: (_, args, { me }) => me,


  posts(_, { limit: limitInput = 10, page = 1 }) {
    const limit = limitInput < 100 ? limitInput : 100
    const offset = limitInput * (page - 1)
    return Post.findAll({
      where: { status: 'published' },
      limit,
      offset,
      order: [['created_at', 'DESC']],
    })
  },
  postsInfo: async () => ({
    count: await Post.count({ where: { status: 'published' } }),
  }),
  post: (_, { slug }) => (
    Post.findOne({ where: { slug } })
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


  groups() {
    return GroupContent.findAll({ where: { lang: 'en' } })
  },


  user: (_, { slug }) => User.findOne({ where: { slug } }),
}

module.exports = queries
