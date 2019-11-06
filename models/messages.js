module.exports = function MessageModel(sequelize, DataTypes) {
  const Message = sequelize.define('Message', {
    thread_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'messages_thread',
        key: 'id',
      },
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
    subject: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    message: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    email_message_id: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  }, {
    tableName: 'messages',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
  })

  return Message
}
