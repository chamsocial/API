
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
  }
}

module.exports = setup
