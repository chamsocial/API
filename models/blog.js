
module.exports = function BlogModel(sequelize, DataTypes) {
  const Blog = sequelize.define('Blog', {
    status: { type: DataTypes.ENUM('draft', 'published', 'deleted'), allowNull: false, defaultValue: 'draft' },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    title: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    markdown: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    author_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
  }, {
    tableName: 'blog',
    underscored: true,
    deletedAt: false,
  })

  return Blog
}
