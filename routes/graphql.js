const router = require('koa-router')()
const { graphqlKoa, graphiqlKoa } = require('graphql-server-koa')
const { attributeFields, defaultListArgs, resolver } = require('graphql-sequelize')
const { GraphQLObjectType, GraphQLList, GraphQLSchema } = require('graphql')
const { decodeJwt } = require('./middleware')
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
        resolve: resolver(Post, {
          before (findOptions, args, context, info) {
            if (!context.userToken || context.userToken === undefined) {
              const sections = info.fieldNodes[0].selectionSet.selections
              const fields = sections.map(selection => selection.name.value)
              const errors = []
              fields.forEach(f => {
                if (!Post.publicFields.includes(f)) errors.push(f)
              })
              if (errors.length) throw new Error(`Must be logged in to access ${errors.join(', ')}`)
            }

            return findOptions
          }
        })
      }
    }
  })
})

router.post('/graphql', decodeJwt, graphqlKoa(ctx => ({
  schema,
  context: { userToken: ctx.userToken }
})))

router.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }))

module.exports = router
