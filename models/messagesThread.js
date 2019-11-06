module.exports = function MessageThreadModel(sequelize, DataTypes) {
  const MessageThread = sequelize.define('MessageThread', {
    subject: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
  }, {
    tableName: 'messages_thread',
    underscored: true,
    createdAt: false,
    updatedAt: false,
  })

  return MessageThread
}
