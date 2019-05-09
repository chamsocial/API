const router = require('koa-router')()

router.get('/test', async ctx => {
  throw new Error('Hmm')
  ctx.body = ctx.user
})

router.all('/upload/:id', async ctx => {
  console.log('USER', ctx.user)
  console.log(ctx.request.files)
  console.log('ID', ctx.params.id)
  console.log('body', ctx.request.body)
  await new Promise(resolve => setTimeout(resolve, 1000))
  ctx.body = { id: Math.round(Math.random() * 1000), type: 'image', url: '/images/moose.png' }
})

router.get('/logout', async ctx => {
  ctx.session = null
  ctx.body = { success: true }
})

module.exports = router
