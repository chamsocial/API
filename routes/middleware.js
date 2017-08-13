const jwt = require('jsonwebtoken')
const { JWT_SECRET } = process.env

async function decodeJwt (ctx, next) {
  const authorization = ctx.request.headers.authorization
  if (!authorization) {
    await next()
    return
  }

  const token = authorization.split(' ').pop()
  try {
    ctx.userToken = await jwt.verify(token, JWT_SECRET)
  } catch (e) {
    const error = new Error('Invalid or expired token')
    error.status = 401
    ctx.throw(error)
  }
  await next()
}

module.exports = {
  decodeJwt
}
