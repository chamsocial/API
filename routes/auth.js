const router = require('koa-router')()
router.prefix('/v2')
const jwt = require('jsonwebtoken')

const { User } = require('../models')
const { JWT_SECRET, JWT_EXPIRE } = process.env

function invalidUserError (title = 'Invalid username or password') {
  const error = new Error(title)
  error.status = 401
  return error
}

router.post('/login', async (ctx, next) => {
  const { username, password } = ctx.request.body
  if (!username || !password) ctx.throw(invalidUserError())

  const user = await User.findOne({ where: { $or: [{ username }, { email: username }] } })
  if (!user) ctx.throw(invalidUserError())

  const activationText = 'The account has not been activated yet. If you have not received the email try to reset your password.'
  if (!user.hasActivated()) ctx.throw(invalidUserError(activationText))

  const validPassword = await user.validPassword(password)
  if (!validPassword) ctx.throw(invalidUserError())

  await user.updateAttributes({ last_login: new Date() })

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRE })
  ctx.body = {
    user: user.getPublicData(),
    token
  }
})

module.exports = router
