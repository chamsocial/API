const { GraphQLSchema } = require('graphql')
const queries = require('./queries')
const mutations = require('./mutations')

const schema = new GraphQLSchema({
  query: queries,
  mutation: mutations
})

module.exports = schema
