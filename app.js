const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const Koa = require('koa')
const app = new Koa()
const cors = require('kcors')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const staticFiles = require('koa-static')

const auth = require('./routes/auth')
const graphqlRoutes = require('./routes/graphql')

// error handler
onerror(app)

// middlewares
app.use(bodyparser({ enableTypes: ['json', 'form', 'text'] }))
app.use(json())
app.use(cors())
if (process.env.NODE_ENV !== 'test') app.use(logger())
app.use(staticFiles(path.join(__dirname, '/public')))

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
        title: err.message
      }]
    }
  }
})

// routes
app.use(auth.routes(), auth.allowedMethods())
app.use(graphqlRoutes.routes(), graphqlRoutes.allowedMethods())

module.exports = app
