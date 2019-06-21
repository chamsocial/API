module.exports = function groupModel(sequelize, DataTypes) {
  const Group = sequelize.define('Group', {
    type: { type: DataTypes.ENUM('open', 'private'), allowNull: false, defaultValue: 'open' },
  }, {
    tableName: 'groups',
    underscored: true,
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  })

  return Group
}
