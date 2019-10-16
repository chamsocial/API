const { resolver } = require('graphql-sequelize')

function authResolver(Model, resolverOptions) {
  return resolver(Model, {
    before(findOptions, args, context, info) {
      if (!context.userToken || context.userToken === undefined) {
        const sections = info.fieldNodes[0].selectionSet.selections
        const fields = sections.map(selection => selection.name.value)
        const errors = []
        fields.forEach(f => {
          if (f === '__typename') return
          if (!Model.publicFields.includes(f)) errors.push(f)
        })
        if (errors.length) {
          context.ctx.status = 401
          throw new Error(`Must be logged in to access ${errors.join(', ')} on ${Model.name}`)
        }
      }

      return findOptions
    },
    ...resolverOptions,
  })
}

module.exports = {
  authResolver,
}
