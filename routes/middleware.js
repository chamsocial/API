const jwt = require('jsonwebtoken')
const { JWT_SECRET } = process.env

async function decodeJwt (ctx, next) {
  const authorization = ctx.request.headers.authorization
  if (!authorization) {
    await next()
    return
  }

  const token = authorization.split(' ').pop()
  if (!token) ctx.throw(new Error('Token is missing'))

  ctx.userToken = await jwt.verify(token, JWT_SECRET)
  await next()
}

module.exports = {
  decodeJwt
}
