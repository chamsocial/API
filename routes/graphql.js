const router = require('koa-router')()
const { graphqlKoa, graphiqlKoa } = require('graphql-server-koa')
const { attributeFields, defaultListArgs, resolver } = require('graphql-sequelize')
const { GraphQLObjectType, GraphQLList, GraphQLSchema, GraphQLString, GraphQLNonNull, GraphQLInt } = require('graphql')
const { decodeJwt } = require('./middleware')
const { Post, User, Comment } = require('../models')
const assign = require('lodash.assign')

const defaultModelArgs = defaultListArgs()

function authResolver (Model, resolverOptions) {
  return resolver(Model, Object.assign({
    before (findOptions, args, context, info) {
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
    }
  }, resolverOptions))
}

const types = {
  post: new GraphQLObjectType({
    name: 'Post',
    description: 'A post',
    fields: () => assign(attributeFields(Post), {
      author: {
        type: types.user,
        args: defaultModelArgs,
        resolve: resolver(Post.User)
      },
      comments: {
        type: new GraphQLList(types.comment),
        args: defaultModelArgs,
        resolve: resolver(Post.Comment, {
          before (findOptions) {
            if (!findOptions.where) findOptions.where = {}
            findOptions.where.$or = [{ parent_id: 0 }, { parent_id: null }]

            if (!findOptions.order) {
              findOptions.order = [ [ 'created_at', 'ASC' ] ]
            }

            return findOptions
          }
        })
      }
    })
  }),
  postsInfo: new GraphQLObjectType({
    name: 'PostsInfo',
    description: 'Info about all posts',
    fields: {
      count: {
        type: GraphQLInt,
        resolve: () => Post.count()
      }
    }
  }),
  user: new GraphQLObjectType({
    name: 'User',
    description: 'A single user',
    fields: () => assign(attributeFields(User), {
      posts: {
        type: new GraphQLList(types.post),
        args: defaultModelArgs,
        resolve: authResolver(User.Post)
      }
    })
  }),
  comment: new GraphQLObjectType({
    name: 'Comment',
    description: 'A comment',
    fields: () => assign(attributeFields(Comment), {
      author: {
        type: types.user,
        args: defaultModelArgs,
        resolve: resolver(Comment.User)
      },
      comments: {
        type: new GraphQLList(types.comment),
        args: defaultModelArgs,
        resolve: resolver(Comment.Comment, {
          before (findOptions) {
            if (!findOptions.order) {
              findOptions.order = [ [ 'created_at', 'ASC' ] ]
            }
            return findOptions
          }
        })
      }
    })
  })
}

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Queries',
    fields: {
      posts: {
        type: new GraphQLList(types.post),
        args: defaultListArgs(),
        resolve: authResolver(Post)
      },
      post: {
        type: types.post,
        args: {
          slug: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: authResolver(Post)
      },
      postsInfo: {
        type: types.postsInfo,
        resolve: () => ({})
      }
    }
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutations',
    fields: {
      createComment: {
        type: types.comment,
        description: 'Create a comment',
        args: {
          postId: { type: new GraphQLNonNull(GraphQLInt) },
          comment: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: (_, {postId, comment}, { userToken }) => {
          if (!userToken || userToken === undefined) {
            throw new Error('Must be logged in')
          }
          return Comment.create({ post_id: postId, content: comment, user_id: userToken.id })
        }
      }
    }
  })
})

router.post('/graphql', decodeJwt, graphqlKoa(ctx => ({
  schema,
  context: { userToken: ctx.userToken, ctx }
})))

router.get('/graphiql', graphiqlKoa({ endpointURL: '/graphql' }))

module.exports = router
