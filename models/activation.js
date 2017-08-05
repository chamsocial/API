module.exports = function (sequelize, DataTypes) {
  const Activation = sequelize.define('Activation', {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id'
      },
      allowNull: false
    },
    code: { type: DataTypes.STRING(42), allowNull: false, defaultValue: '' },
    verified_at: { type: DataTypes.DATE, allowNull: true },
    create_ip: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    verified_ip: { type: DataTypes.STRING, allowNull: false, defaultValue: '' }
  }, {
    tableName: 'activations',
    underscored: true,
    updatedAt: false,
    deletedAt: false
  })

  return Activation
}
