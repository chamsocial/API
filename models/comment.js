const showdown = require('showdown')
const converter = new showdown.Converter()

module.exports = function (sequelize, DataTypes) {
  const Comment = sequelize.define('Comment', {
    post_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'posts',
        key: 'id'
      },
      defaultValue: 0
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id'
      },
      allowNull: false
    },
    parent_id: { type: DataTypes.INTEGER.UNSIGNED, default: 0 },
    email_message_id: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    made_in: { type: DataTypes.ENUM('web', 'email'), allowNull: false, defaultValue: 'web' },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
      get () {
        return converter.makeHtml(this.getDataValue('content'))
      }
    }
  }, {
    tableName: 'comments',
    underscored: true,
    deletedAt: false,
    updatedAt: false
  })

  Comment.publicFields = []

  return Comment
}
