const router = require('koa-router')()
const { graphqlKoa, graphiqlKoa } = require('graphql-server-koa')
const { attributeFields, defaultListArgs, resolver } = require('graphql-sequelize')
const { GraphQLObjectType, GraphQLList, GraphQLSchema, GraphQLString, GraphQLNonNull, GraphQLInt } = require('graphql')
const { decodeJwt } = require('./middleware')
const { Post, User } = require('../models')
const assign = require('lodash.assign')

const defaultModelArgs = defaultListArgs()

function authResolver (Model) {
  return resolver(Model, {
    before (findOptions, args, context, info) {
      if (!context.userToken || context.userToken === undefined) {
        const sections = info.fieldNodes[0].selectionSet.selections
        const fields = sections.map(selection => selection.name.value)
        const errors = []
        fields.forEach(f => {
          if (f === '__typename') return
          if (!Model.publicFields.includes(f)) errors.push(f)
        })
        if (errors.length) {
          context.ctx.status = 401
          throw new Error(`Must be logged in to access ${errors.join(', ')} on ${Model.name}`)
        }
      }

      return findOptions
    }
  })
}

const types = {
  post: new GraphQLObjectType({
    name: 'Post',
    description: 'A post',
    fields: () => assign(attributeFields(Post), {
      author: {
        type: types.user,
        args: defaultModelArgs,
        resolve: resolver(Post.User)
      }
    })
  }),
  postsInfo: new GraphQLObjectType({
    name: 'PostsInfo',
    description: 'Info about all posts',
    fields: {
      count: {
        type: GraphQLInt,
        resolve: () => Post.count()
      }
    }
  }),
  user: new GraphQLObjectType({
    name: 'User',
    description: 'A single user',
    fields: () => assign(attributeFields(User), {
      posts: {
        type: new GraphQLList(types.post),
        args: defaultModelArgs,
        resolve: authResolver(User.Post)
      }
    })
  })
}

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Queries',
    fields: {
      posts: {
        type: new GraphQLList(types.post),
        args: defaultListArgs(),
        resolve: authResolver(Post)
      },
      post: {
        type: types.post,
        args: {
          slug: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: authResolver(Post)
      },
      postsInfo: {
        type: types.postsInfo,
        resolve: () => ({})
      }
    }
  })
})

router.post('/graphql', decodeJwt, graphqlKoa(ctx => ({
  schema,
  context: { userToken: ctx.userToken, ctx }
})))

router.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }))

module.exports = router
