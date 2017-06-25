const router = require('koa-router')()
router.prefix('/v2')

const { User } = require('../models')

function invalidUser (ctx) {
  ctx.status = 401
  ctx.body = {
    errors: [{ title: 'Invalid username or password' }]
  }
}

router.post('/login', async (ctx, next) => {
  const { username, password } = ctx.request.body

  const user = await User.findOne({ where: { $or: [{ username }, { email: username }] } })
  if (!user) return invalidUser(ctx)

  const validPassword = await user.validPassword(password)
  if (!validPassword) return invalidUser(ctx)

  // @TODO generate jwt token
  ctx.body = {
    user
  }
})

module.exports = router
