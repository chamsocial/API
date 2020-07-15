module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define('Comment', {
    post_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'posts',
        key: 'id',
      },
      defaultValue: 0,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
    parent_id: { type: DataTypes.INTEGER.UNSIGNED, default: null },
    email_message_id: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    made_in: { type: DataTypes.ENUM('web', 'email'), allowNull: false, defaultValue: 'web' },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
  }, {
    tableName: 'comments',
    underscored: true,
    deletedAt: false,
    updatedAt: false,
  })

  Comment.publicFields = []

  return Comment
}
