const { ApolloServer } = require('apollo-server-koa')
const resolvers = require('./resolvers')
const typeDefs = require('./typeDefs')
// const context = require('../context')

// const schema = require('../graphql/schema')

const server = new ApolloServer({
  resolvers,
  typeDefs,
})

module.exports = app => server.applyMiddleware({
  app,
  cors: { credentials: true },
})
