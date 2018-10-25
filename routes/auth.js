const router = require('koa-router')()

router.get('/test', async ctx => {
  ctx.body = ctx.user
})

router.get('/logout', async ctx => {
  ctx.session = null
  ctx.body = { success: true }
})

module.exports = router
