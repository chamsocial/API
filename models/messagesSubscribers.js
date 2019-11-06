module.exports = function MessageSubscriberModel(sequelize, DataTypes) {
  const MessageSubscriber = sequelize.define('MessageSubscriber', {
    thread_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'messageThread',
        key: 'id',
      },
      allowNull: false,
      primaryKey: true,
      autoIncrement: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
    seen: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'messages_subscribers',
    underscored: true,
    createdAt: false,
    updatedAt: false,
  })

  return MessageSubscriber
}
