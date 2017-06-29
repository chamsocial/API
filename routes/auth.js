const router = require('koa-router')()
router.prefix('/v2')
const jwt = require('jsonwebtoken')

const { User } = require('../models')
const { JWT_SECRET, JWT_EXPIRE } = process.env

function invalidUser (ctx, title = 'Invalid username or password') {
  ctx.status = 401
  ctx.body = {
    errors: [{ title }]
  }
}

router.post('/login', async (ctx, next) => {
  const { username, password } = ctx.request.body
  if (!username || !password) return invalidUser(ctx)

  const user = await User.findOne({ where: { $or: [{ username }, { email: username }] } })
  if (!user) return invalidUser(ctx)

  const activationText = 'The account has not been activated yet. If you have not received the email try to reset your password.'
  if (!user.hasActivated()) return invalidUser(ctx, activationText)

  const validPassword = await user.validPassword(password)
  if (!validPassword) return invalidUser(ctx)

  await user.updateAttributes({ last_login: new Date() })

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRE })
  ctx.body = {
    user: user.getPublicData(),
    token
  }
})

module.exports = router
