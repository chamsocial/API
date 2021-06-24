const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const sharp = require('sharp')
const { v4: uuidv4 } = require('uuid')
const { AuthenticationError, ApolloError } = require('apollo-server-koa')
const { Media } = require('../../../models')
const logger = require('../../../config/logger')

const fsStat = promisify(fs.stat)
const fsMkdir = promisify(fs.mkdir)
const fsUnlink = promisify(fs.unlink)

const { UPLOADS_DIR } = process.env


const mediaMutations = {
  async uploadFile(parent, { file, postId }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    // { filename: 'logo.png', mimetype: 'image/png', encoding: '7bit' }
    const { createReadStream, filename, mimetype } = await file
    const stream = createReadStream()
    const chunks = []
    await new Promise((resolve, reject) => {
      stream
        .on('data', data => chunks.push(data))
        .on('end', resolve)
        .on('error', reject)
    })

    const parsedFile = path.parse(filename)
    const newFilename = `${uuidv4()}${parsedFile.ext}`
    const absPath = `${UPLOADS_DIR}${me.id}/`
    const newFilePath = `${absPath}${newFilename}`

    const mediaData = {
      user_id: me.id,
      filename: newFilename,
      mime: mimetype,
    }

    // // Verify or create path
    try {
      await fsStat(absPath)
    } catch (e) {
      await fsMkdir(absPath)
    }

    const img = await sharp(Buffer.concat(chunks))
      .resize(2500, 2500, { fit: 'inside', withoutEnlargement: true })
      .rotate()
      .toFile(newFilePath)

    mediaData.width = img.width
    mediaData.height = img.height
    mediaData.size = img.size
    const media = await Media.create(mediaData)
    await media.addPosts([postId])

    return media
  },

  async deleteFile(_, { id }, { me }) {
    const media = await Media.findByPk(id)
    if (!media) throw new ApolloError('No file found')
    if (media.user_id !== me.id) throw new AuthenticationError('No, just no!')

    const filePath = path.resolve(UPLOADS_DIR, String(media.user_id), media.filename)
    try {
      await fsUnlink(filePath)
    } catch (err) {
      logger.error('DELETE_FILE_ERROR', {
        error: err, filePath, fileId: media.id, userId: me.id,
      })
    }
    await media.destroy({ force: true })

    return id
  },
}


module.exports = mediaMutations
