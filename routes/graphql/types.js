const { GraphQLDateTime } = require('graphql-iso-date')
const gravatar = require('gravatar')
const { AuthenticationError } = require('apollo-server-koa')
const { GraphQLUpload } = require('graphql-upload')
const {
  User, Comment, Post, GroupContent, Op,
} = require('../../models')

const types = {
  Upload: GraphQLUpload,
  DateTime: GraphQLDateTime,
  Post: {
    commentsCount: post => post.comments_count,
    canEdit: (post, args, { me }) => post.user_id === me.id,
    group: async post => GroupContent.findOne({ where: { group_id: post.group_id, lang: 'en' } }),
    author: post => User.findByPk(post.user_id),
    comments: post => Comment.findAll({
      where: {
        post_id: post.id,
        parent_id: { [Op.or]: [null, 0] },
      },
      limit: 500,
    }),
  },
  PostsList: {
    totalCount: (post, args, { postListWhere }) => Post.count({ where: postListWhere }),
  },
  Comment: {
    createdAt: comment => comment.created_at || comment.createdAt,
    parentId: comment => comment.parent_id,
    author: comment => User.findByPk(comment.user_id),
    comments: comment => Comment.findAll({ where: { parent_id: comment.id }, limit: 500 }),
  },
  User: {
    firstName: user => user.first_name,
    lastName: user => user.last_name,
    companyName: user => user.company_name,
    email: (user, args, { me = {} }) => {
      if (user.id !== me.id) return null
      return user.email
    },
    bouncing: (user, args, { me = {} }) => {
      if (user.id !== me.id) return null
      return user.bouncing
    },
    posts: (user, { count = 10 }) => {
      const limit = count >= 1 && count <= 100 ? count : 10
      return Post.findAll({
        where: { user_id: user.id, status: 'published' },
        order: [['created_at', 'DESC']],
        limit,
      })
    },
    avatarUrl: user => gravatar.url(user.email, { s: '100', d: 'retro' }, true),
    createdAt: user => user.created_at || user.createdAt,
  },
  Group: {
    id: group => group.group_id,
    subscription: (group, args, { me, loaders }) => {
      if (!me) throw new AuthenticationError('You must be logged in.')
      return loaders.emailSubscriptions.load({ groupId: group.group_id, userId: me.id })
    },
  },
  Media: {
    type: media => {
      if (['image/jpeg', 'image/png', 'image/gif'].includes(media.mime)) return 'image'
      return null
    },
    userId: media => media.user_id,
  },
  MessageThread: {
    lastMessageAt: messageThread => messageThread.Messages[0].created_at,
    seenAt: messageThread => messageThread.MessageSubscribers[0].seen,
    users: async (messageThread, args, { me, loaders }) => {
      const users = await loaders.messageThreadUsers.load(messageThread.id)
      return users.filter(user => user.id !== me.id)
    },
    messages: messageThread => messageThread.Messages,
  },
  Message: {
    createdAt: message => message.created_at || message.createdAt,
    user: (message, args, { loaders }) => loaders.getUser.load(message.user_id),
  },
}

module.exports = types
