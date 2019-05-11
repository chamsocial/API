const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const gm = require('gm')
const uuidv4 = require('uuid/v4')
const { UserInputError, AuthenticationError } = require('apollo-server-koa')
const {
  Activation, User, Post, Comment, Media,
  Op, sequelize,
} = require('../../../models')
const createUser = require('../../../mutators/createUser')

const fsStat = promisify(fs.stat)
const fsMkdir = promisify(fs.mkdir)

function invalidUserError(title = 'Invalid username or password') {
  const error = new Error(title)
  error.status = 401
  return error
}

const mutations = {
  async login(_, { username, password }, { ctx }) {
    if (!username || !password) throw invalidUserError()

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } })
    if (!user) throw invalidUserError()

    const activationText = 'The account has not been activated yet. If you have not received the email try to reset your password.'
    if (!user.hasActivated()) throw invalidUserError(activationText)

    const validPassword = await user.validPassword(password)
    if (!validPassword) throw invalidUserError()

    await user.update({ last_login: new Date() })
    ctx.session.user = user.id
    return user.getPublicData()
  },

  async createUser(_, { username, email, password }, { ctx }) {
    return createUser({ username, email, password }, ctx.request.ip)
      .catch(err => {
        if (err instanceof sequelize.ValidationError) {
          const errors = err.errors.map(e => ({ message: e.message, path: e.path }))
          throw new UserInputError('Create user errors', { errors })
        }
        // @TODO Log
        throw new Error('A server error occured please try again later.')
      })
  },

  async activateUser(_, { code }, { ctx }) {
    const activation = await Activation.findOne({ where: { code, verified_at: null } })
    if (!activation) throw new Error('No code activation found')
    activation.verified_ip = ctx.request.ip
    activation.verified_at = new Date()
    await activation.save()

    const user = await User.findOne({ where: { id: activation.user_id } })
    await user.update({ last_login: new Date(), activated: 1 })
    ctx.session.user = user.id
    return user.getPublicData()
  },

  async updateUser(_, { slug, ...fields }, { me }) {
    if (!me || me.slug !== slug) throw new AuthenticationError('You are not authorized to edit this profile.')

    const user = await User.findByPk(me.id)
    user.first_name = fields.firstName
    user.last_name = fields.lastName
    user.company_name = fields.companyName
    user.jobtitle = fields.jobtitle
    user.interests = fields.interests
    user.aboutme = fields.aboutme
    user.lang = fields.lang
    await user.save()
    return user
  },

  async createComment(_, { postSlug, comment, parentId }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    if (comment.length < 3) throw new UserInputError('Comment error', { errors: [{ message: 'To short' }] })
    let newComment

    try {
      const post = await Post.findOne({ where: { slug: postSlug } })
      newComment = await Comment.create({
        post_id: post.id,
        content: comment,
        user_id: me.id,
        parent_id: parentId,
      })
      post.comments_count += 1
      await post.save()
    } catch (e) {
      console.error('SAVE_COMMENT', { user_id: me.id, postSlug }, e)
      throw new Error('Could not save comment')
    }

    return newComment
  },
  async createPost(_, { title, content, status }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    return Post.create({
      user_id: me.id,
      title,
      content,
      status,
      slug: uuidv4(),
      group_id: 6,
    })
  },


  deleteDraft(_, { id }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    return Post
      .update({ status: 'deleted' }, { where: { id, user_id: me.id } })
      .then(() => true)
  },

  async uploadFile(parent, { file, postId }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    // { filename: 'logo.png', mimetype: 'image/png', encoding: '7bit' }
    const { createReadStream, filename, mimetype } = await file
    const stream = createReadStream()


    const publicFolderPath = path.resolve(__dirname, '../../../public')
    const parsedFile = path.parse(filename)
    const newFilename = `${uuidv4()}${parsedFile.ext}`
    const publicPath = `/uploads/${me.id}/`
    const absPath = `${publicFolderPath}${publicPath}`
    const newFilePath = `${absPath}${newFilename}`

    const mediaData = {
      user_id: me.id,
      filename: newFilename,
      mime: mimetype,
    }

    // // Verify or create path
    await fsStat(absPath).catch(() => fsMkdir(absPath))

    // Save the image
    await new Promise((resolve, reject) => {
      gm(stream)
        .autoOrient()
        .resize(2500, 2500, '>')
        .size((err, size) => {
          if (!err) return
          mediaData.width = size.width
          mediaData.height = size.height
        })
        .write(newFilePath, err => {
          if (err) return reject(err)
          return resolve()
        })
    })

    const fileInfo = await fsStat(newFilePath)
    mediaData.size = fileInfo.size

    const media = await Media.create(mediaData)

    await media.addPosts([postId])

    return media
  },
}

module.exports = mutations
