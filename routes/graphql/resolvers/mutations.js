const { UserInputError } = require('apollo-server-koa')
const {
  Activation, User, Op, sequelize,
} = require('../../../models')
const createUser = require('../../../mutators/createUser')

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
  async createUser(_, { username, email, password }, { ctx }) {
    return createUser({ username, email, password }, ctx.request.ip)
      .catch(err => {
        if (err instanceof sequelize.ValidationError) {
          const errors = err.errors.map(e => ({ message: e.message, path: e.path }))
          throw new UserInputError('Create user errors', { errors })
        }
        // @TODO Log
        throw new Error('A server error occured please try again later.')
      })
  },
  async activateUser(_, { code }, { ctx }) {
    const activation = await Activation.findOne({ where: { code, verified_at: null } })
    if (!activation) throw new Error('No code activation found')
    activation.verified_ip = ctx.request.ip
    activation.verified_at = new Date()
    await activation.save()

    const user = await User.findOne({ where: { id: activation.user_id } })
    await user.update({ last_login: new Date(), activated: 1 })
    ctx.session.user = user.id
    return user.getPublicData()
  },
}

module.exports = mutations
