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


  drafts(_, args, { me }) {
    return Post.findAll({
      where: { user_id: me.id },
      limit: 10,
      order: [['created_at', 'DESC']],
    })
  },


  user: (_, { slug }) => User.findOne({ where: { slug } }),
}

module.exports = queries
