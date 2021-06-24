const { v4: uuidv4 } = require('uuid')
const { AuthenticationError } = require('apollo-server-koa')
const { Activation, User, Op } = require('../../../models')
const createUser = require('../../../mutators/createUser')
const redis = require('../../../config/redis')
const resetPasswordEmail = require('../../../emails/resetPassword')
const { cleanContent } = require('../../../utils/content')


function invalidUserError(title = 'Invalid username or password') {
  const error = new Error(title)
  error.status = 401
  return error
}


const auth = {
  async login(_, { username, password }, context) {
    if (!username || !password) throw invalidUserError()

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } })
    if (!user) throw invalidUserError()

    const activationText = 'The account has not been activated yet. If you have not received the email try to reset your password.'
    if (!user.hasActivated()) throw invalidUserError(activationText)

    const validPassword = await user.validPassword(password)
    if (!validPassword) throw invalidUserError()

    await user.update({ last_login: new Date() })
    context.ctx.session.user = user.id
    context.me = user
    return user.getPublicData()
  },

  async forgotPassword(parent, { username }) {
    if (!username) return false

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } })
    if (!user) return false

    const token = uuidv4()
    await redis.set(`forgot:${token}`, user.id)
    const EXPIRE_IN_SEC = 2 * 24 * 60 * 60
    await redis.expire(`forgot:${token}`, EXPIRE_IN_SEC)

    await resetPasswordEmail(user, token)
    return true
  },
  async resetPassword(parent, { token, password }, context) {
    if (!token || !password || String(password).length < 6) return null

    const userId = await redis.get(`forgot:${token}`)
    if (!userId) return null
    const user = await User.findByPk(userId)
    if (!user) return null
    // Activate if not activated
    await user.update({ password })
    await redis.del(`forgot:${token}`)

    // Login user
    context.ctx.session.user = user.id
    return user.getPublicData()
  },

  async createUser(_, { username, email, password }, { ctx }) {
    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } })
    if (user) {
      const inUse = []
      if (user.get('username').toLowerCase() === username.toLowerCase()) inUse.push('Username')
      if (user.get('email').toLowerCase() === email.toLowerCase()) inUse.push('Email')
      return { success: false, error: { message: `${inUse.join(' and ')} already in use.` } }
    }
    await createUser({ username, email, password }, ctx.request.ip)
    return { success: true }
  },

  async activateUser(_, { code }, context) {
    const activation = await Activation.findOne({ where: { code, verified_at: null } })
    if (!activation) throw new Error('No code activation found')
    activation.verified_ip = context.ctx.request.ip
    activation.verified_at = new Date()
    await activation.save()

    const user = await User.findOne({ where: { id: activation.user_id } })
    await user.update({ last_login: new Date(), activated: 1 })
    context.ctx.session.user = user.id
    context.me = user
    return user.getPublicData()
  },

  async updateUser(_, fields, { me }) {
    if (!me) throw new AuthenticationError('You are not authorized to edit this profile.')

    const user = await User.findByPk(me.id)
    user.first_name = cleanContent(fields.firstName)
    user.last_name = cleanContent(fields.lastName)
    user.company_name = cleanContent(fields.companyName)
    user.jobtitle = cleanContent(fields.jobtitle)
    user.interests = cleanContent(fields.interests)
    user.aboutme = cleanContent(fields.aboutme)
    user.lang = fields.lang === 'fr' ? 'fr' : 'en'
    await user.save()
    return user
  },

  async unbounceUser(_, fields, { me }) {
    if (!me) throw new AuthenticationError('You are not authorized.')
    const user = await User.findByPk(me.id)
    user.bouncing = 0
    await user.save()
    return user
  },
}


module.exports = auth
