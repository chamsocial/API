/* eslint-disable class-methods-use-this */
// const http = require('http')
const { ApolloServer, GraphQLError } = require('@apollo/server')
const { koaMiddleware } = require('@as-integrations/koa')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
const graphqlUploadKoa = require('graphql-upload/graphqlUploadKoa.js')
const resolvers = require('./resolvers')
const typeDefs = require('./typeDefs')
const loaders = require('./dataloaders')

// @TODO: Replace GraphQLError with proper error (GraphQLError = undefined)
console.log('Error', GraphQLError)

async function startServer(app) {
  const httpServer = app

  const server = new ApolloServer({
    resolvers,
    typeDefs,
    context: ({ ctx }) => ({ loaders, ctx, me: ctx.user }),
    formatError: error => {
      const isApolloError = (
        false
        // error.originalError instanceof GraphQLError || error instanceof GraphQLError
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
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        requestDidStart: requestContext => {
          console.log('🚀', requestContext.request.operationName)
          return {
            didEncounterErrors(ctx) {
              if (!ctx.operation) return
              ctx.errors.forEach(err => {
                // if (err instanceof GraphQLError
                // || err.originalError instanceof GraphQLError) return
                console.log('XXX', err, ctx)
                console.error('APOLLO_ERROR', err, {
                  kind: ctx?.operation?.operation,
                  operationName: ctx?.operationName,
                  query: ctx?.request?.query,
                  variables: ctx.request?.variables,
                  user: ctx?.context?.user,
                  path: err?.path,
                })
              })
            },
          }
        },
      },
    ],
  })

  await server.start()

  app.use(
    graphqlUploadKoa({
      // Limits here should be stricter than config for surrounding infrastructure
      // such as NGINX so errors can be handled elegantly by `graphql-upload`.
      maxFileSize: 10000000, // 10 MB
      maxFiles: 10,
    }),
  )

  app.use(
    koaMiddleware(server, {
      // context: async ({ ctx }) => ({ token: ctx.headers.token }),
      context: ({ ctx }) => ({ loaders, ctx, me: ctx.user }),
    }),
  )

  // app.use(graphqlUploadKoa({
  //   // Limits here should be stricter than config for surrounding
  //   // infrastructure such as Nginx so errors can be handled elegantly by
  //   // graphql-upload:
  //   // https://github.com/jaydenseric/graphql-upload#type-uploadoptions
  //   maxFileSize: 10485760, // 10 MB
  //   maxFiles: 10,
  // }))
  // server.applyMiddleware({
  //   app,
  //   cors: { credentials: true },
  // })
}

module.exports = startServer
