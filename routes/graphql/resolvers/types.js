const { GraphQLDateTime } = require('graphql-iso-date')
const gravatar = require('gravatar')
const {
  User, Comment, Post, GroupContent,
} = require('../../../models')

const types = {
  DateTime: GraphQLDateTime,
  Post: {
    commentsCount: post => post.comments_count,
    canEdit: (post, args, { me }) => post.user_id === me.id,
    group: async post => GroupContent.findOne({ where: { group_id: post.group_id, lang: 'en' } }),
    author: post => User.findByPk(post.user_id),
    comments: post => Comment.findAll({ where: { post_id: post.id }, limit: 500 }),
  },
  Comment: {
    createdAt: comment => comment.created_at,
    parentId: comment => comment.parent_id,
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
  Group: {
    id: group => group.group_id,
  },
}

module.exports = types
