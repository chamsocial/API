/* eslint-disable class-methods-use-this */
const { ApolloServer, ApolloError } = require('apollo-server-koa')
const { graphqlUploadKoa } = require('graphql-upload')
const resolvers = require('./resolvers')
const typeDefs = require('./typeDefs')
const loaders = require('./dataloaders')


const server = new ApolloServer({
  resolvers,
  typeDefs,
  context: ({ ctx }) => ({ loaders, ctx, me: ctx.user }),
  formatError: error => {
    const isApolloError = (
      error.originalError instanceof ApolloError || error instanceof ApolloError
    )

    console.log('GRAPHQL_ERROR', {
      message: error.message,
      stack: error.originalError ? error.originalError.stack : error.stack,
      query: error.source ? error.source.body : '',
    })

    return isApolloError
      ? error
      : { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' }
  },
  uploads: false,
  plugins: [{
    requestDidStart: requestContext => {
      console.log('🚀', requestContext.request.operationName)
      return {
        didEncounterErrors(ctx) {
          if (!ctx.operation) return
          ctx.errors.forEach(err => {
            if (err instanceof ApolloError || err.originalError instanceof ApolloError) return
            console.error('APOLLO_ERROR', err, {
              kind: ctx.operation.operation,
              operationName: ctx.operationName,
              query: ctx.request.query,
              variables: ctx.request.variables,
              user: ctx.context.user,
              path: err.path,
            })
          })
        },
      }
    },
  }],
})


module.exports = app => {
  app.use(graphqlUploadKoa({
    // Limits here should be stricter than config for surrounding
    // infrastructure such as Nginx so errors can be handled elegantly by
    // graphql-upload:
    // https://github.com/jaydenseric/graphql-upload#type-uploadoptions
    maxFileSize: 10485760, // 10 MB
    maxFiles: 10,
  }))
  server.applyMiddleware({
    app,
    cors: { credentials: true },
  })
}
