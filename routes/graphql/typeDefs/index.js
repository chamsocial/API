const fs = require('fs')
const path = require('path')

function graphqlFile(file) {
  return fs.readFileSync(path.join(__dirname, `${file}.graphql`), 'utf8')
}

const types = graphqlFile('types')
const queries = graphqlFile('queries')
const mutations = graphqlFile('mutations')

module.exports = [types, queries, mutations]
