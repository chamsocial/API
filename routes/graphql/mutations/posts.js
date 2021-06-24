const slugify = require('slug')
const { UserInputError, AuthenticationError } = require('apollo-server-koa')
const { Post } = require('../../../models')
const { cleanContent } = require('../../../utils/content')


async function generateSlug(Model, name) {
  const slug = slugify(name, { lower: true }).substr(0, 200)
  const slugExist = await Model.findOne({ where: { slug } })
  if (slugExist) return `${slug}-${Date.now()}`.substr(0, 200)
  return slug
}


const postMutations = {
  async createPost(_, {
    title, content, status, groupId,
  }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    if (status === 'published' && !groupId) {
      throw new UserInputError('Group missing', { errors: [{ message: 'A group has to be selected' }] })
    }
    const slug = await generateSlug(Post, title)

    return Post.create({
      user_id: me.id,
      title: cleanContent(title),
      content: cleanContent(content),
      status,
      slug,
      group_id: groupId || 0,
    })
  },

  async editPost(_, args, { me }) {
    const post = await Post.findByPk(args.id)
    if (!me) throw new AuthenticationError('You must be logged in.')
    if (post.user_id !== me.id) throw new AuthenticationError('You can\'t edit some one else post.')

    post.title = cleanContent(args.title)
    post.content = cleanContent(args.content)
    post.status = args.status
    post.group_id = args.groupId

    await post.save()
    return post
  },

  // @TODO remove media
  deletePost(_, { id }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    return Post
      .update({ status: 'deleted' }, { where: { id, user_id: me.id } })
      .then(() => true)
  },
}


module.exports = postMutations
