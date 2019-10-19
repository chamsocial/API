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
  .filter(file => (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js'))
  .forEach(file => {
    const model = sequelize.import(path.join(__dirname, file))
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


db.Post.belongsToMany(db.Media, {
  through: {
    model: db.MediaRelations,
    unique: false,
  },
  foreignKey: 'id',
})

db.Media.belongsToMany(db.Post, {
  through: {
    model: db.MediaRelations,
    unique: false,
  },
  foreignKey: 'media_id',
})


// Trigger emails
function triggerEmail(type, id) {
  redisClient.publish('send_email', JSON.stringify({ command: type, params: { id } }))
}

db.Comment.addHook('afterCreate', comment => {
  triggerEmail('comment', comment.id)
})
db.Post.addHook('afterCreate', post => {
  if (post.status === 'published') {
    triggerEmail('post', post.id)
  }
})
db.Post.addHook('afterUpdate', (post, options) => {
  if (options.fields.includes('status') && post.status === 'published') {
    triggerEmail('post', post.id)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize
db.Op = Sequelize.Op

module.exports = db
