module.exports = function (sequelize, DataTypes) {
  const Post = sequelize.define('Post', {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id'
      },
      allowNull: false
    },
    status: { type: DataTypes.ENUM('draft', 'published', 'deleted'), allowNull: false, defaultValue: 'draft' },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    group_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'groups',
        key: 'id'
      },
      allowNull: false
    },
    comments_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    email_message_id: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    made_in: { type: DataTypes.ENUM('web', 'email'), allowNull: false, defaultValue: 'web' },
    title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    content: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' }
  }, {
    tableName: 'posts',
    underscored: true,
    deletedAt: false
  })

  Post.publicFields = [
    'id',
    'use_id',
    'title',
    'comments_count',
    'created_at',
    'slug'
  ]

  return Post
}
