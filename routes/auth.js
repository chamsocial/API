const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const router = require('koa-router')()
const sanitizeFilename = require('sanitize-filename')

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
  try {
    await fs.promises.access(file)
    ctx.body = sharp(file).resize(width, height)
  } catch (e) {
    ctx.type = 'image/png'
    ctx.body = fs.createReadStream(path.resolve(__dirname, '../public/images/missing.png'))
  }
})


const isNumber = /^\d*$/
async function missingImage(ctx, next) {
  try {
    await next()
  } catch (e) {
    console.log('THUMBNAIL_FAILED', e)
    if (ctx.get('X-NginX-Proxy')) {
      console.log('404 Yes')
      ctx.set('X-Accel-Redirect', '/secret-media/missing.png')
      ctx.status = 200
      ctx.body = 'Ok'
    } else {
      console.log('404 no')
      ctx.type = 'image/png'
      ctx.body = fs.createReadStream(path.resolve(__dirname, '../public/images/missing.png'))
    }
  }
}
router.get('/thumb/:userId/:h/:w/:filename', missingImage, async ctx => {
  const {
    w, h, userId, filename,
  } = ctx.params
  const { useAbs } = ctx.request.query
  const cleanFilename = sanitizeFilename(filename)
  const ext = path.extname(cleanFilename).replace('.', '').toLowerCase()
  const mime = mimes[ext]
  if (
    !isNumber.test(userId) && !isNumber.test(w) && !isNumber.test(h)
  ) throw new Error('Has to be numeric')
  if (!mime) throw new Error('Invalid file format')
  if (cleanFilename !== filename) throw new Error('Invalid file name')
  let width = parseInt(w, 10)
  let height = parseInt(h, 10)
  if (Number.isNaN(width) || width < 10 || width > 2000) width = 500
  if (Number.isNaN(height) || height < 10 || height > 2000) height = 500

  const file = path.resolve(UPLOADS_DIR, userId, cleanFilename)
  await fs.promises.access(file)

  const relThumbPath = path.join(userId, h, w)
  const absThumbPath = path.join(process.env.THUMBNAIL_DIR, relThumbPath)
  try {
    await fs.promises.stat(absThumbPath)
  } catch (e) {
    await fs.promises.mkdir(absThumbPath, { recursive: true })
  }

  console.log('Hello image')

  const absThumbFile = path.join(absThumbPath, cleanFilename)
  const thumbUrl = path.join(relThumbPath, cleanFilename)
  ctx.set('X-Accel-Redirect', path.join('/secret-media', '/thumb/', thumbUrl))

  console.log('Headers', ctx.headers)
  if (ctx.get('X-NginX-Proxy')) {
    console.log('Yes')
    await sharp(file).resize(width, height).toFile(absThumbFile)
    ctx.body = ''
  } else {
    console.log('No')
    ctx.body = sharp(file).resize(width, height)
  }
})


module.exports = router
