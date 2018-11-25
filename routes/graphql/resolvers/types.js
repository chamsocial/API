const { GraphQLDateTime } = require('graphql-iso-date')
const gravatar = require('gravatar')
const { User, Comment, Post } = require('../../../models')

const types = {
  DateTime: GraphQLDateTime,
  Post: {
    createdAt: post => post.created_at,
    commentsCount: post => post.comments_count,
    author: post => User.findByPk(post.user_id),
    comments: post => Comment.findAll({ where: { post_id: post.id }, limit: 500 }),
  },
  Comment: {
    author: comment => User.findByPk(comment.user_id),
    comments: comment => Comment.findAll({ where: { parent_id: comment.id }, limit: 500 }),
  },
  User: {
    firstName: user => user.first_name,
    lastName: user => user.last_name,
    companyName: user => user.company_name,
    posts: user => Post.findAll({ where: { user_id: user.id }, limit: 100 }),
    avatarUrl: user => gravatar.url(user.email, { s: '100', d: 'identicon' }, true),
  },
}

module.exports = types
