require('dotenv').config()
const Koa = require('koa')
const app = new Koa()
const path = require('path')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const staticFiles = require('koa-static')

const auth = require('./routes/auth')
const users = require('./routes/users')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({ enableTypes: ['json', 'form', 'text'] }))
app.use(json())
if (process.env.NODE_ENV !== 'test') app.use(logger())
app.use(staticFiles(path.join(__dirname, '/public')))

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = err.message
    ctx.app.emit('error', err, ctx)
  }
})

// routes
app.use(auth.routes(), auth.allowedMethods())
app.use(users.routes(), users.allowedMethods())

module.exports = app
