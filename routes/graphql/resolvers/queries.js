const { AuthenticationError } = require('apollo-server-koa')
const { Post, User } = require('../../../models')

const queries = {
  me: (_, args, { me }) => me,


  posts(_, { limit: limitInput = 10, page = 1 }) {
    const limit = limitInput < 100 ? limitInput : 100
    const offset = limitInput * (page - 1)
    return Post.findAll({ limit, offset, order: [['created_at', 'DESC']] })
  },


  postsInfo: async () => ({
    count: await Post.count(),
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
  draft(_, { postId }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    return Post.findOne({ where: { id: postId, user_id: me.id, status: 'draft' } })
  },


  user: (_, { slug }) => User.findOne({ where: { slug } }),
}

module.exports = queries
