const { Post } = require('../../../models')

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
}

module.exports = queries
