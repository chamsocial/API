const { defaultListArgs } = require('graphql-sequelize')
const {
  GraphQLObjectType, GraphQLList, GraphQLString, GraphQLNonNull,
} = require('graphql')
const { Post, User } = require('../models')
const { authResolver } = require('./resolvers')
const types = require('./types')

const queries = new GraphQLObjectType({
  name: 'Queries',
  fields: {
    posts: {
      type: new GraphQLList(types.post),
      args: defaultListArgs(),
      resolve: authResolver(Post),
    },
    post: {
      type: types.post,
      args: {
        slug: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: authResolver(Post),
    },
    postsInfo: {
      type: types.postsInfo,
      resolve: () => ({}),
    },
    user: {
      type: types.user,
      args: {
        slug: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: authResolver(User),
    },
  },
})

module.exports = queries
