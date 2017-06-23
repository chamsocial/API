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
app.use(logger())
app.use(staticFiles(path.join(__dirname, '/public')))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// routes
app.use(auth.routes(), auth.allowedMethods())
app.use(users.routes(), users.allowedMethods())

module.exports = app
