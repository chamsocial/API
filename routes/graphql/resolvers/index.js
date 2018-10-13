const types = require('./types')
const queries = require('./queries')
// const mutations = require('./mutations')

const resolvers = {
  Query: queries,
  // Mutation: mutations,
  ...types,
}

module.exports = resolvers
