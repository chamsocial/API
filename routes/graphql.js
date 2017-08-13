const router = require('koa-router')()
const { graphqlKoa, graphiqlKoa } = require('graphql-server-koa')
const { decodeJwt } = require('./middleware')
const schema = require('../graphql/schema')

router.post('/graphql', decodeJwt, graphqlKoa(ctx => ({
  schema,
  context: { userToken: ctx.userToken, ctx }
})))

router.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }))

module.exports = router
