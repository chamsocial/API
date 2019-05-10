/* eslint-disable class-methods-use-this */
const { ApolloServer } = require('apollo-server-koa')
const resolvers = require('./resolvers')
const typeDefs = require('./typeDefs')

class BasicLogging {
  requestDidStart(data) {
    console.log('Operation', data.operationName)
  }
}

const server = new ApolloServer({
  resolvers,
  typeDefs,
  context: ({ ctx }) => ({ ctx, me: ctx.user }),
  formatError: error => {
    console.log('GraphQL error:', error.message, error.originalError.stack)
    if (error.extensions.code === 'INTERNAL_SERVER_ERROR') return new Error('Internal server error')
    return error
  },
  extensions: [() => new BasicLogging()],
})

module.exports = app => server.applyMiddleware({
  app,
  cors: { credentials: true },
})
