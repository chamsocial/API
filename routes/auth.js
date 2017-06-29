const router = require('koa-router')()
router.prefix('/v2')

const { User } = require('../models')

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

  // @TODO generate jwt token
  ctx.body = {
    user
  }
})

module.exports = router
