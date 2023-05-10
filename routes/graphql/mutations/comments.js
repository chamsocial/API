const { GraphQLError } = require('@apollo/server')
const { Post, Comment } = require('../../../models')
const logger = require('../../../config/logger')
const { cleanContent } = require('../../../utils/content')


const commentMutations = {
  async createComment(_, { postSlug, comment, parentId }, { me }) {
    if (!me) throw new GraphQLError('You must be logged in.')
    if (comment.length < 3) throw new GraphQLError('Comment error', { errors: [{ message: 'To short' }] })
    let newComment

    try {
      const post = await Post.findOne({ where: { slug: postSlug } })
      newComment = await Comment.create({
        post_id: post.id,
        content: cleanContent(comment),
        user_id: me.id,
        parent_id: parentId,
      })
      post.comments_count += 1
      await post.save()
    } catch (e) {
      logger.error('SAVE_COMMENT', { error: e, user_id: me.id, postSlug })
      throw new Error('Could not save comment')
    }

    return newComment
  },
}


module.exports = commentMutations
