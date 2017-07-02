const factoryGirl = require('factory-girl')
const factory = factoryGirl.factory
const adapter = new factoryGirl.SequelizeAdapter()
factory.setAdapter(adapter)

const { User, Group, GroupContent, Post } = require('../../models')

factory.define('User', User, {
  username: factory.sequence('User.name', n => `Skier ${n}`),
  email: factory.sequence('user.email', n => `dummy-user-${n}@example.com`),
  slug: factory.sequence('User.slug', n => `${factory.chance('guid')()}-${n}`),
  activated: 1
})

factory.define('Group', Group, { type: 'open' })
factory.define('GroupContent', GroupContent, {
  group_id: factory.assoc('Group', 'id'),
  title: factory.chance('word'),
  description: factory.chance('word'),
  slug: factory.chance('guid')
})

factory.define('Post', Post, {
  user_id: factory.assoc('User', 'id'),
  status: 'published',
  group_id: factory.assoc('Group', 'id'),
  title: factory.chance('sentence'),
  content: factory.chance('paragraph'),
  slug: factory.sequence('Post.slug', n => `${factory.chance('guid')()}-${n}`)
})

module.exports = factory
