module.exports = function groupsContentModel(sequelize, DataTypes) {
  const GroupUser = sequelize.define('GroupUser', {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
      primaryKey: true,
    },
    group_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'groups',
        key: 'id',
      },
      allowNull: false,
      primaryKey: true,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('none', 'direct', 'daily', 'weekly'),
      allowNull: false,
      defaultValue: 'none',
    },
  }, {
    tableName: 'groups_users',
    underscored: true,
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  })

  return GroupUser
}
