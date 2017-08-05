'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const basename = path.basename(module.filename)
const env = process.env.NODE_ENV || 'development'
const config = require('../config/db.js')[env]
const redisClient = require('../config/redis')
const db = {}

const sequelize = new Sequelize(config.database, config.username, config.password, config)

fs
  .readdirSync(__dirname)
  .filter(function (file) {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
  })
  .forEach(function (file) {
    const model = sequelize['import'](path.join(__dirname, file))
    db[model.name] = model
  })

Object.keys(db).forEach(function (modelName) {
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

// Trigger emails

db.Comment.hook('afterCreate', (comment, options) => {
  triggerEmail('comment', comment.id)
})
db.Post.hook('afterCreate', (post, options) => {
  if (post.status === 'published') {
    triggerEmail('post', post.id)
  }
})
db.Post.hook('afterUpdate', (post, options) => {
  if (options.fields.includes('status') && post.status === 'published') {
    triggerEmail('post', post.id)
  }
})
function triggerEmail (type, id) {
  redisClient.publish('send_email', JSON.stringify({ command: type, params: { id } }))
}

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
