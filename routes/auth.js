const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const Hashids = require('hashids/cjs')
const router = require('koa-router')()
const sanitizeFilename = require('sanitize-filename')
const logger = require('../config/logger')
const { User, GroupUser } = require('../models')


const { UPLOADS_DIR, HASHIDS_SALT } = process.env
const hashids = new Hashids(HASHIDS_SALT, 15)


router.get('/test', async ctx => {
  if (process.env.NODE_ENV !== 'development') return
  if (!ctx.user) throw new Error('Hmm')
  ctx.body = ctx.user
})

router.get('/hash/:id', async ctx => {
  if (process.env.NODE_ENV !== 'development') return
  ctx.body = hashids.encode(ctx.params.id)
})

router.post('/unsubscribe/:user/:time/:group', async ctx => {
  const { group } = ctx.params
  const [userId] = hashids.decode(ctx.params.user)
  const [time] = hashids.decode(ctx.params.time)
  if (!userId || !time) throw new Error('Invalid user')
  const dateTime = new Date(time)
  const user = await User.findOne({ where: { id: userId, created_at: dateTime } })
  if (!user) throw new Error('Invalid user')

  if (group === 'daily') {
    await GroupUser.update(
      { type: 'none' },
      { where: { user_id: userId, type: 'daily' } },
    )
  } else {
    if (Number.isNaN(Number(group))) throw new Error('Invalid group')
    await GroupUser.update(
      { type: 'none' },
      { where: { user_id: userId, group_id: group } },
    )
  }

  ctx.body = { success: true }
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
    logger.error('THUMBNAIL_FAILED', e)
    if (ctx.get('X-NginX-Proxy')) {
      ctx.set('X-Accel-Redirect', '/secret-media/missing.png')
      ctx.set('Content-Type', 'image/png')
      ctx.body = 'OK'
    } else {
      ctx.type = 'image/png'
      ctx.body = fs.createReadStream(path.resolve(__dirname, '../public/images/missing.png'))
    }
  }
}
router.get('/thumb/:userId/:h/:w/:filename', missingImage, async ctx => {
  const {
    w, h, userId, filename,
  } = ctx.params
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

  // Local development
  if (!ctx.get('X-NginX-Proxy')) {
    ctx.body = sharp(file).resize(width, height)
    return
  }

  const absThumbFile = path.join(absThumbPath, cleanFilename)
  await sharp(file).resize(width, height).toFile(absThumbFile)

  ctx.set('X-Accel-Redirect', path.join('/secret-media', '/thumb/', relThumbPath, cleanFilename))
  ctx.set('Content-Type', mime)
  ctx.body = 'OK'
})

// router.get('/thumb/*', async ctx => {
//   ctx.set('X-Accel-Redirect', '/secret-media/missing.png')
//   ctx.set('X-I-ChamSocial', 'Hello')
//   ctx.body = 'Ok'
// })


module.exports = router
