'use strict'

var fs = require('fs')
var path = require('path')
var Sequelize = require('sequelize')
var basename = path.basename(module.filename)
var env = process.env.NODE_ENV || 'development'
var config = require('../config/db.js')[env]
var db = {}

const sequelize = new Sequelize(config.database, config.username, config.password, config)

fs
  .readdirSync(__dirname)
  .filter(function (file) {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
  })
  .forEach(function (file) {
    var model = sequelize['import'](path.join(__dirname, file))
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

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
