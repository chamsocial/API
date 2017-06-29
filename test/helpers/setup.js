
const { User, sequelize } = require('../../models')

const setup = {
  initDB () {
    return User.sync()
  },
  destroyDB () {
    return sequelize.drop()
  }
}

module.exports = setup
