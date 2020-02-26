module.exports = function MediaModel(sequelize, DataTypes) {
  const Media = sequelize.define('Media', {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
    filename: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    filepath: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    width: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    height: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    mime: {
      type: DataTypes.ENUM('application/octet-stream', 'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/x-icon', 'application/pdf', 'text/plain', 'text/markdown'),
      allowNull: false,
      defaultValue: 'application/octet-stream',
    },
  }, {
    getterMethods: {
      url() {
        return `/uploads/${this.getDataValue('user_id')}/${this.getDataValue('filename')}`
      },
    },
    paranoid: false,
    tableName: 'media',
    underscored: true,
    updatedAt: false,
  })

  return Media
}
