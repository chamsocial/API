const { User } = require('../models')

function isAuthorized(ctx, next) {
  if (ctx.session.user) return next()

  const error = new Error('Unauthorized!')
  error.status = 401
  return ctx.throw(error)
}

const setUser = async (ctx, next) => {
  if (!ctx.session.user) return next()
  ctx.user = await User.findById(ctx.session.user)
  return next()
}

module.exports = {
  isAuthorized,
  setUser,
}
