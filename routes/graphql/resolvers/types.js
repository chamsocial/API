const { GraphQLDateTime } = require('graphql-iso-date')
const { User, Comment } = require('../../../models')

const types = {
  DateTime: GraphQLDateTime,
  Post: {
    author: post => User.findById(post.user_id),
    comments: post => Comment.findAll({ where: { post_id: post.id }, limit: 500 }),
  },
  Comment: {
    author: comment => User.findById(comment.user_id),
    comments: comment => Comment.findAll({ where: { parent_id: comment.id }, limit: 500 }),
  },
}

module.exports = types
