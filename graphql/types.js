const assign = require('lodash.assign')
const { attributeFields, defaultListArgs, resolver } = require('graphql-sequelize')
const {
  GraphQLObjectType, GraphQLList, GraphQLString, GraphQLInt,
} = require('graphql')
const { Post, User, Comment } = require('../models')

const defaultModelArgs = defaultListArgs()

const types = {
  post: new GraphQLObjectType({
    name: 'Post',
    description: 'A post',
    fields: () => assign(attributeFields(Post), {
      author: {
        type: types.user,
        args: defaultModelArgs,
        resolve: resolver(Post.User),
      },
      comments: {
        type: new GraphQLList(types.comment),
        args: defaultModelArgs,
        resolve: resolver(Post.Comment, {
          before(findOptions) {
            if (!findOptions.where) findOptions.where = {}
            findOptions.where.$or = [{ parent_id: 0 }, { parent_id: null }]

            if (!findOptions.order) {
              findOptions.order = [['created_at', 'ASC']]
            }

            return findOptions
          },
        }),
      },
    }),
  }),
  postsInfo: new GraphQLObjectType({
    name: 'PostsInfo',
    description: 'Info about all posts',
    fields: {
      count: {
        type: GraphQLInt,
        resolve: () => Post.count(),
      },
    },
  }),
  user: new GraphQLObjectType({
    name: 'User',
    description: 'A single user',
    fields: () => assign(attributeFields(User), {
      posts: {
        type: new GraphQLList(types.post),
        args: defaultModelArgs,
        resolve: resolver(User.Post),
      },
    }),
  }),
  comment: new GraphQLObjectType({
    name: 'Comment',
    description: 'A comment',
    fields: () => assign(attributeFields(Comment), {
      author: {
        type: types.user,
        args: defaultModelArgs,
        resolve: resolver(Comment.User),
      },
      comments: {
        type: new GraphQLList(types.comment),
        args: defaultModelArgs,
        resolve: resolver(Comment.Comment, {
          before(findOptions) {
            if (!findOptions.order) {
              findOptions.order = [['created_at', 'ASC']]
            }
            return findOptions
          },
        }),
      },
    }),
  }),
  activation: new GraphQLObjectType({
    name: 'Activation',
    description: 'Activate a user',
    fields: () => ({
      user: {
        type: types.user,
        args: defaultModelArgs,
        resolve: mutationData => mutationData.user,
      },
      token: {
        type: GraphQLString,
        resolve: mutationData => mutationData.token,
      },
    }),
  }),
}

module.exports = types
