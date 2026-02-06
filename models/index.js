const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const Sequelize = require('sequelize')

const fsUnlink = promisify(fs.unlink)

const basename = path.basename(module.filename)
const env = process.env.NODE_ENV || 'development'
const config = require('../config/db')[env]
const redisClient = require('../config/redis')
const logger = require('../config/logger')

const { UPLOADS_DIR, THUMBNAIL_DIR } = process.env

const db = {}

const sequelize = new Sequelize(config.database, config.username, config.password, config)

fs
  .readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
  .forEach(file => {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
    db[model.name] = model
  })

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.Post.User = db.Post.belongsTo(db.User)
db.User.Post = db.User.hasMany(db.Post)

db.Post.Comment = db.Post.hasMany(db.Comment)
db.Comment.Post = db.Comment.belongsTo(db.Post)

db.User.Comment = db.User.hasMany(db.Comment)
db.Comment.User = db.Comment.belongsTo(db.User)

db.Comment.Comment = db.Comment.hasMany(db.Comment, { foreignKey: 'parent_id' })

db.Activation.User = db.Activation.belongsTo(db.User)

db.Message.Thread = db.MessageThread.hasMany(db.Message, { foreignKey: 'thread_id' })
db.MessageSubscriber.Thread = db.MessageThread.hasMany(db.MessageSubscriber, { foreignKey: 'thread_id' })
db.MessageThread.Message = db.Message.belongsTo(db.MessageThread, { foreignKey: 'thread_id' })
db.MessageThread.MessageSubscriber = db.MessageSubscriber.belongsTo(db.MessageThread, { foreignKey: 'thread_id' })

db.Message.Subscriber = db.MessageSubscriber.hasMany(db.Message, { foreignKey: 'thread_id', sourceKey: 'thread_id' })
db.MessageSubscriber.Message = db.Message.hasMany(db.MessageSubscriber, { foreignKey: 'thread_id', sourceKey: 'thread_id' })

db.MessageSubscriber.User = db.User.hasMany(db.MessageSubscriber, { foreignKey: 'user_id' })
db.User.MessageSubscriber = db.MessageSubscriber.belongsTo(db.User, { foreignKey: 'user_id' })

// Bookmarks
db.User.belongsToMany(db.Post, { through: 'bookmarks', as: 'bookmark' })
db.Post.belongsToMany(db.User, { through: 'bookmarks', as: 'bookmark' })


db.Post.hasMany(db.Media, { foreignKey: 'post_id' })
db.Media.belongsTo(db.Post, { foreignKey: 'post_id' })


// Trigger emails
function triggerEmail(type, params) {
  redisClient.publish('send_email', JSON.stringify({ command: type, params }))
}

db.Comment.addHook('afterCreate', comment => {
  triggerEmail('comment', { id: comment.id })
})
db.Post.addHook('afterCreate', post => {
  if (post.status === 'published') {
    triggerEmail('post', { id: post.id })
  }
})
db.Post.addHook('afterUpdate', (post, options) => {
  if (options.fields.includes('status') && post.status === 'published') {
    triggerEmail('post', { id: post.id })
  }
})
db.Message.addHook('afterCreate', message => {
  triggerEmail('new_pm', { message_id: message.id })
})

// Clean up physical files and thumbnails when media records are deleted
db.Media.addHook('beforeDestroy', async media => {
  if (!UPLOADS_DIR) {
    logger.error('UPLOADS_DIR is not set, skipping file cleanup', { fileId: media.id })
    return
  }
  const filePath = path.resolve(UPLOADS_DIR, String(media.user_id), media.filename)

  // Delete original file
  try {
    await fsUnlink(filePath)
    logger.info(`Deleted file: ${filePath}`)
  } catch (err) {
    logger.error('FILE_CLEANUP_ERROR', {
      error: err, filePath, fileId: media.id, userId: media.user_id,
    })
    // Don't throw - allow DB deletion to proceed even if file delete fails
  }

  // Delete all generated thumbnails for this file
  if (THUMBNAIL_DIR) {
    const userThumbDir = path.resolve(THUMBNAIL_DIR, String(media.user_id))
    try {
      // Check if user thumbnail directory exists
      const stat = await fs.promises.stat(userThumbDir)
      if (stat.isDirectory()) {
        // Recursively scan for all thumbnails of this file
        await deleteThumbnailsRecursive(userThumbDir, media.filename)
      }
    } catch (err) {
      // Directory doesn't exist or other error - log but don't fail
      logger.error('THUMBNAIL_CLEANUP_ERROR', {
        error: err, userThumbDir, fileId: media.id, userId: media.user_id,
      })
    }
  }
})

// Helper function to recursively delete thumbnails
async function deleteThumbnailsRecursive(dir, targetFilename) {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await deleteThumbnailsRecursive(fullPath, targetFilename)
      } else if (entry.isFile() && entry.name === targetFilename) {
        // Found a thumbnail - delete it
        try {
          await fsUnlink(fullPath)
          logger.info(`Deleted thumbnail: ${fullPath}`)
        } catch (err) {
          logger.error('THUMBNAIL_DELETE_ERROR', { error: err, path: fullPath })
        }
      }
    }
  } catch (err) {
    logger.error('THUMBNAIL_SCAN_ERROR', { error: err, dir })
  }
}

db.sequelize = sequelize
db.Sequelize = Sequelize
db.Op = Sequelize.Op

module.exports = db
