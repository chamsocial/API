const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const Koa = require('koa')
const session = require('koa-session')
const cors = require('kcors')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const staticFiles = require('koa-static')

const auth = require('./routes/auth')
const middleware = require('./routes/middleware')
const graphqlRoutes = require('./routes/graphql')

const app = new Koa()

app.keys = [process.env.SESSION_SECRET]
const SESSION_CONFIG = {
  key: 'cs:s',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  autoCommit: true,
  rolling: true,
  renew: true,
}

app.use(session(SESSION_CONFIG, app))

// error handler
onerror(app)

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason) // eslint-disable-line
  // application specific logging, throwing an error, or other logic here
})

// middlewares
app.use(bodyparser({ enableTypes: ['json', 'form', 'text'] }))
app.use(json())
if (process.env.NODE_ENV !== 'test') app.use(logger())
app.use(staticFiles(path.join(__dirname, '/public')))

app.use(cors({ credentials: true }))

app.use(middleware.setUser)

app.use(async (ctx, next) => {
  try {
    await next()
    const status = ctx.status || 404
    if (status === 404) ctx.throw(404)
  } catch (err) {
    // will only respond with JSON
    ctx.status = err.statusCode || err.status || 500
    ctx.body = {
      errors: [{
        title: err.message,
      }],
    }
  }
})

// routes
app.use(auth.routes(), auth.allowedMethods())
graphqlRoutes(app)

module.exports = app
