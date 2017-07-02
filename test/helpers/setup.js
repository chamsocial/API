const jwt = require('jsonwebtoken')

const { JWT_SECRET } = process.env
const { User, Group, GroupContent, Post, sequelize } = require('../../models')

const setup = {
  initDB () {
    const promises = [
      User.sync(),
      Group.sync(),
      GroupContent.sync(),
      Post.sync()
    ]

    return Promise.all(promises)
  },
  destroyDB () {
    return sequelize.drop()
  },
  jwtToken (obj = { id: 42 }) {
    return jwt.sign(obj, JWT_SECRET)
  }
}

module.exports = setup
