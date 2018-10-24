const router = require('koa-router')()

router.get('/test', async ctx => {
  ctx.body = ctx.user
})

module.exports = router
