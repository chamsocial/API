const router = require('koa-router')()
const { graphqlKoa, graphiqlKoa } = require('graphql-server-koa')

const { attributeFields, defaultListArgs, resolver } = require('graphql-sequelize')
const { GraphQLObjectType, GraphQLList, GraphQLSchema } = require('graphql')
const { Post } = require('../models')

const types = {
  post: new GraphQLObjectType({
    name: 'Post',
    description: 'A post',
    fields: attributeFields(Post)
  })
}

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Queries',
    fields: {
      posts: {
        type: new GraphQLList(types.post),
        args: defaultListArgs(),
        resolve: resolver(Post)
      }
    }
  })
})

router.post('/graphql', graphqlKoa(ctx => ({
  schema,
  context: { user: ctx.user }
})))

router.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }))

module.exports = router
