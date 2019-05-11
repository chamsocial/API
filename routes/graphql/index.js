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
    console.log('GraphQL error:', error.message, error.originalError && error.originalError.stack)
    if (error.extensions.code === 'INTERNAL_SERVER_ERROR') return new Error('Internal server error')
    return error
  },
  uploads: {
    // Limits here should be stricter than config for surrounding
    // infrastructure such as Nginx so errors can be handled elegantly by
    // graphql-upload:
    // https://github.com/jaydenseric/graphql-upload#type-uploadoptions
    maxFileSize: 10000000, // 10 MB
    maxFiles: 20,
  },
  extensions: [() => new BasicLogging()],
})

module.exports = app => server.applyMiddleware({
  app,
  cors: { credentials: true },
})
