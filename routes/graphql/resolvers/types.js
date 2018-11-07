const { GraphQLDateTime } = require('graphql-iso-date')
const { User } = require('../../../models')

const types = {
  DateTime: GraphQLDateTime,
  Post: {
    author: post => User.findById(post.user_id),
  },
}

module.exports = types
