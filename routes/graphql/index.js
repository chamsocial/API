const { ApolloServer } = require('@apollo/server')
const { koaMiddleware } = require('@as-integrations/koa')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
// eslint-disable-next-line import/extensions
const graphqlUploadKoa = require('graphql-upload/graphqlUploadKoa.js')
const resolvers = require('./resolvers')
const typeDefs = require('./typeDefs')
const loaders = require('./dataloaders')


async function startServer(httpServer, app) {
  const server = new ApolloServer({
    resolvers,
    typeDefs,
    csrfPrevention: true,
    context: ({ ctx }) => ({ loaders, ctx, me: ctx.user }),
    formatError: error => {
      console.log('GRAPHQL_ERROR', {
        message: error.message,
        stack: error.originalError ? error.originalError.stack : error.stack,
        query: error.source ? error.source.body : '',
      })

      return { message: 'An error', code: 'ERROR' }
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
                console.error('APOLLO_ERROR', err, {
                  kind: ctx?.operation?.operation,
                  operationName: ctx?.operationName,
                  query: ctx?.request?.query,
                  variables: ctx?.request?.variables,
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
      context: ({ ctx }) => ({ loaders, ctx, me: ctx.user }),
    }),
  )
}

module.exports = startServer
