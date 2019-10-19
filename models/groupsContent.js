module.exports = function groupsContentModel(sequelize, DataTypes) {
  const GroupContent = sequelize.define('GroupContent', {
    group_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'groups',
        key: 'id',
      },
      allowNull: false,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    lang: { type: DataTypes.STRING(2), allowNull: false, defaultValue: 'en' },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  }, {
    tableName: 'groups_content',
    underscored: true,
    createdAt: false,
    updatedAt: false,
    deletedAt: false,
  })

  return GroupContent
}
