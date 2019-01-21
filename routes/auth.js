const router = require('koa-router')()

router.get('/test', async ctx => {
  ctx.body = ctx.user
})

router.all('/upload', async ctx => {
  console.log(ctx.request.files)
  ctx.body = 'hello'
})

router.get('/logout', async ctx => {
  ctx.session = null
  ctx.body = { success: true }
})

module.exports = router
