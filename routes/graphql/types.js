const { GraphQLDateTime } = require('graphql-iso-date')
const gravatar = require('gravatar')
const { AuthenticationError } = require('apollo-server-koa')
const {
  User, Comment, Post, GroupContent,
} = require('../../models')

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
    posts: (user, { count = 10 }) => {
      const limit = count >= 1 && count <= 100 ? count : 10
      return Post.findAll({ where: { user_id: user.id, status: 'published' }, limit })
    },
    avatarUrl: user => gravatar.url(user.email, { s: '100', d: 'identicon' }, true),
  },
  Group: {
    id: group => group.group_id,
    subscription: (group, args, { me, loaders }) => {
      if (!me) throw new AuthenticationError('You must be logged in.')
      return loaders.emailSubscriptions.load({ groupId: group.group_id, userId: me.id })
    },
  },
  EmailSubscription: {
    id: groupUser => `${groupUser.user_id}-${groupUser.group_id}`,
    groupId: groupUser => groupUser.group_id,
    joinedAt: groupUser => groupUser.joined_at,
  },
}

module.exports = types