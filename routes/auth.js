const path = require('path')
const sharp = require('sharp')
const router = require('koa-router')()

const { UPLOADS_DIR } = process.env

router.get('/test', async ctx => {
  if (!ctx.user) throw new Error('Hmm')
  ctx.body = ctx.user
})

router.get('/logout', async ctx => {
  ctx.session = null
  ctx.body = { success: true }
})


const mimes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
}

/**
 * @TODO store images
 */
router.get('/img/:h/:w/uploads/:userId/:filename', async ctx => {
  const {
    w, h, userId, filename,
  } = ctx.params
  const ext = path.extname(filename).replace('.', '').toLowerCase()
  const mime = mimes[ext]
  if (!mime) throw new Error('Invalid file format')
  let width = parseInt(w, 10)
  let height = parseInt(h, 10)
  if (Number.isNaN(width) || width < 10 || width > 2000) width = 500
  if (Number.isNaN(height) || height < 10 || height > 2000) height = 500

  const file = path.resolve(UPLOADS_DIR, userId, filename)
  ctx.body = sharp(file).resize(width, height)
})


module.exports = router
