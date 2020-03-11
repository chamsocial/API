const showdown = require('showdown')
const Sequelize = require('sequelize')

const converter = new showdown.Converter()


module.exports = function PostModel(sequelize, DataTypes) {
  const Post = sequelize.define('Post', {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
    status: { type: DataTypes.ENUM('draft', 'published', 'deleted'), allowNull: false, defaultValue: 'draft' },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    group_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'groups',
        key: 'id',
      },
      allowNull: false,
    },
    comments_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    email_message_id: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    made_in: { type: DataTypes.ENUM('web', 'email'), allowNull: false, defaultValue: 'web' },
    title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    content: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    hasMedia: {
      type: DataTypes.VIRTUAL(DataTypes.BOOLEAN),
      set(val) { return this.setDataValue('hasMedia', val) },
      get() { return this.getDataValue('hasMedia') },
    },
  }, {
    getterMethods: {
      htmlContent() {
        return converter.makeHtml(this.getDataValue('content'))
      },
    },
    tableName: 'posts',
    underscored: true,
    deletedAt: false,
  })

  Post.hasMediaAttribute = Sequelize.literal(
    'EXISTS(SELECT id FROM media_relations WHERE media_relations.id = Post.id) AS hasMedia',
  )
  Post.publicFields = [
    'id',
    // 'user_id',
    'status',
    'slug',
    // 'group_id',
    'comments_count',
    'title',
    'content',
    'createdAt',
    'updatedAt',
  ]

  return Post
}
