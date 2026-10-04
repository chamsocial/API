const slugify = require('slug')
const { GraphQLError } = require('graphql')
const { Post } = require('../../../models')
const { cleanContent } = require('../../../utils/content')


function timestampSlug(slug) {
  // Keep room for the suffix — truncating after appending would return a
  // 200-char base unchanged and keep the collision
  const suffix = `-${Date.now()}`
  return slug.substr(0, 200 - suffix.length) + suffix
}

async function generateSlug(Model, name) {
  const slug = slugify(name, { lower: true }).substr(0, 200)
  const slugExist = await Model.findOne({ where: { slug } })
  if (slugExist) return timestampSlug(slug)
  return slug
}


const postMutations = {
  async createPost(_, {
    title, content, status, groupId,
  }, { me }) {
    if (!me) throw new GraphQLError('You must be logged in.')
    if (status === 'published' && !groupId) {
      throw new GraphQLError('Group missing', { errors: [{ message: 'A group has to be selected' }] })
    }
    const cleanTitle = cleanContent(title)
    const slug = await generateSlug(Post, cleanTitle)

    return Post.create({
      user_id: me.id,
      title: cleanTitle,
      content: cleanContent(content),
      status,
      slug,
      group_id: groupId || 0,
    })
  },

  async editPost(_, args, { me }) {
    if (!me) throw new GraphQLError('You must be logged in.')
    const post = await Post.findByPk(args.id)
    if (!post) throw new GraphQLError('Post not found.')
    if (post.user_id !== me.id) throw new GraphQLError('You can\'t edit some one else post.')

    post.title = cleanContent(args.title)
    post.content = cleanContent(args.content)
    post.status = args.status
    post.group_id = args.groupId
    // Drafts from the new app have no slug until published
    const mintedSlug = !post.slug && post.status === 'published'
    if (mintedSlug) post.slug = await generateSlug(Post, post.title)

    try {
      await post.save()
    } catch (err) {
      // slug is the only unique key — a concurrent publish won the
      // check-then-save race, so retry once with a timestamped slug
      if (!mintedSlug || err.name !== 'SequelizeUniqueConstraintError') throw err
      post.slug = timestampSlug(post.slug)
      await post.save()
    }
    return post
  },

  // @TODO remove media
  deletePost(_, { id }, { me }) {
    if (!me) throw new GraphQLError('You must be logged in.')
    return Post
      .update({ status: 'deleted' }, { where: { id, user_id: me.id } })
      .then(() => true)
  },

  async toggleBookmark(_, { postId, bookmarked }, { me }) {
    if (!me) throw new GraphQLError('You must be logged in.')

    if (bookmarked) await me.addBookmark(postId)
    else await me.removeBookmark(postId)

    return bookmarked
  },
}


module.exports = postMutations
