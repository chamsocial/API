const { GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLInt } = require('graphql')
const { Post, User, Comment, Activation } = require('../models')
const createUser = require('../mutators/createUser')
const authUtils = require('../utils/auth')
const types = require('./types')

const mutations = new GraphQLObjectType({
  name: 'Mutations',
  fields: {
    createComment: {
      type: types.comment,
      description: 'Create a comment',
      args: {
        postSlug: { type: new GraphQLNonNull(GraphQLString) },
        comment: { type: new GraphQLNonNull(GraphQLString) },
        parentId: { type: GraphQLInt }
      },
      resolve: async (_, {postSlug, comment, parentId}, { userToken }) => {
        let newComment
        if (!userToken || userToken === undefined) {
          throw new Error('Must be logged in')
        }

        try {
          const post = await Post.findOne({ where: { slug: postSlug } })
          newComment = await Comment.create({
            post_id: post.id,
            content: comment,
            user_id: userToken.id,
            parent_id: parentId
          })
          post.comments_count++
          await post.save()
        } catch (e) {
          console.log('SAVE_COMMENT', { user_id: userToken.id, postSlug }, e)
          throw new Error('Could not save comment')
        }

        return newComment
      }
    },
    createUser: {
      type: types.user,
      description: 'Create a new user',
      args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: (_, {username, email, password}, { ctx }) => {
        return createUser({ username, email, password }, ctx.request.ip)
          .catch(validationErrors)
      }
    },
    activateUser: {
      type: types.activation,
      args: {
        code: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: (_, { code }, { ctx }) => {
        return Activation.findOne({ where: { code, verified_at: null } })
          .then(activation => {
            if (!activation) throw new Error('No code activation found')
            activation.verified_ip = ctx.request.ip
            activation.verified_at = new Date()
            return activation.save()
          })
          .then(activation => {
            return User.findOne({ where: { id: activation.user_id } })
          })
          .then(user => {
            user.activated = 1
            return user.save()
          })
          .then(user => {
            return {
              user: user,
              token: authUtils.generateJWT(user)
            }
          })
      }
    },
    updateUser: {
      type: types.user,
      description: 'Update a new user',
      args: {
        slug: { type: new GraphQLNonNull(GraphQLString) },
        first_name: { type: GraphQLString },
        last_name: { type: GraphQLString },
        interests: { type: GraphQLString },
        aboutme: { type: GraphQLString },
        jobtitle: { type: GraphQLString },
        lang: { type: GraphQLString }
      },
      resolve: (_, data, { userToken }) => {
        const { slug } = data
        if (userToken.slug !== slug) throw new Error('Not allowed')
        return User.findOne({ where: { slug: slug } })
      }
    }
  }
})

function validationErrors (e) {
  if (!e.errors) return e
  const errors = e.errors.map(error => error.message)
  return new Error(`Validation: ${errors.join(', ')}`)
}

module.exports = mutations
