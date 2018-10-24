const { User, Op } = require('../../../models')

function invalidUserError(title = 'Invalid username or password') {
  const error = new Error(title)
  error.status = 401
  return error
}

const mutations = {
  async login(_, { username, password }, { ctx }) {
    if (!username || !password) throw invalidUserError()

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } })
    if (!user) throw invalidUserError()

    const activationText = 'The account has not been activated yet. If you have not received the email try to reset your password.'
    if (!user.hasActivated()) throw invalidUserError(activationText)

    const validPassword = await user.validPassword(password)
    if (!validPassword) throw invalidUserError()

    await user.updateAttributes({ last_login: new Date() })
    ctx.session.user = user.id
    return user.getPublicData()
  },
}

module.exports = mutations
