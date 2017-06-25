
const { User } = require('../../models')

const setup = {
  initDB () {
    return User.sync()
  }
}

module.exports = setup
