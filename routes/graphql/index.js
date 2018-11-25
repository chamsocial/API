const { ApolloServer } = require('apollo-server-koa')
const resolvers = require('./resolvers')
const typeDefs = require('./typeDefs')

const server = new ApolloServer({
  resolvers,
  typeDefs,
  context: ({ ctx }) => ({ ctx, me: ctx.user }),
  formatError: error => {
    console.log('GraphQL error:', error)
    if (error.extensions.code === 'INTERNAL_SERVER_ERROR') return new Error('Internal server error')
    return error
  },
})

module.exports = app => server.applyMiddleware({
  app,
  cors: { credentials: true },
})
