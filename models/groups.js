module.exports = function groupModel(sequelize, DataTypes) {
  const Group = sequelize.define('Group', {
    type: { type: DataTypes.ENUM('open', 'private'), allowNull: false, defaultValue: 'open' },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'groups',
    underscored: true,
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  })

  return Group
}
