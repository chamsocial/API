module.exports = function MediaRelationsModel(sequelize, DataTypes) {
  const MediaRelations = sequelize.define('MediaRelations', {
    media_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'media',
        key: 'id',
      },
      allowNull: false,
      primaryKey: true,
      autoIncrement: false,
    },
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'post',
        key: 'id',
      },
      allowNull: false,
      primaryKey: true,
      autoIncrement: false,
    },
    type: {
      type: DataTypes.ENUM('post', 'comment', 'message'),
      allowNull: false,
      defaultValue: 'post',
    },
  }, {
    tableName: 'media_relations',
    underscored: true,
    createdAt: false,
    updatedAt: false,
  })

  return MediaRelations
}
