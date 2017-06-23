const router = require('koa-router')()

router.prefix('/v2')

router.get('/login', async (ctx, next) => {
  ctx.body = {
    title: 'Login'
  }
})

module.exports = router
