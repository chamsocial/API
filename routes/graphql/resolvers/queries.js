const { Post, User } = require('../../../models')

const queries = {
  me: (_, args, { me }) => me,
  async posts(_, { limit: limitInput = 10, page = 1 }) {
    const limit = limitInput < 100 ? limitInput : 100
    const offset = limitInput * (page - 1)
    const posts = await Post.findAll({ limit, offset, order: [['created_at', 'DESC']] })
    return posts
  },
  postsInfo: async () => ({
    count: await Post.count(),
  }),
  post: (_, { slug }) => Post.findOne({ where: { slug } }),
  user: (_, { slug }) => User.findOne({ where: { slug } }),
}

module.exports = queries
