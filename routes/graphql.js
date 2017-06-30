const router = require('koa-router')()
const { graphqlKoa, graphiqlKoa } = require('graphql-server-koa')

router.post('/graphql', graphqlKoa(ctx => ({
  schema: '',
  context: { user: ctx.user }
})))

router.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }))

module.exports = router
