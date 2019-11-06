const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const gm = require('gm')
const uuidv4 = require('uuid/v4')
const slugify = require('slug')
const { UserInputError, AuthenticationError, ApolloError } = require('apollo-server-koa')
const {
  Activation, User, Post, Comment, Media,
  MessageSubscriber, Message,
  Op, sequelize,
} = require('../../models')
const createUser = require('../../mutators/createUser')
const updateEmailSubscriptions = require('./mutations/updateEmailSubscriptions')
const logger = require('../../config/logger')

const fsStat = promisify(fs.stat)
const fsMkdir = promisify(fs.mkdir)
const fsUnlink = promisify(fs.unlink)

const { UPLOADS_DIR } = process.env


function invalidUserError(title = 'Invalid username or password') {
  const error = new Error(title)
  error.status = 401
  return error
}


async function generateSlug(Model, name) {
  const slug = slugify(name, { lower: true }).substr(0, 200)
  const slugExist = await Model.findOne({ where: { slug } })
  if (slugExist) return `${slug}-${Date.now()}`.substr(0, 200)
  return slug
}


const mutations = {
  updateEmailSubscriptions,
  async login(_, { username, password }, context) {
    if (!username || !password) throw invalidUserError()

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } })
    if (!user) throw invalidUserError()

    const activationText = 'The account has not been activated yet. If you have not received the email try to reset your password.'
    if (!user.hasActivated()) throw invalidUserError(activationText)

    const validPassword = await user.validPassword(password)
    if (!validPassword) throw invalidUserError()

    await user.update({ last_login: new Date() })
    context.ctx.session.user = user.id
    context.me = user
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

  async activateUser(_, { code }, context) {
    const activation = await Activation.findOne({ where: { code, verified_at: null } })
    if (!activation) throw new Error('No code activation found')
    activation.verified_ip = context.ctx.request.ip
    activation.verified_at = new Date()
    await activation.save()

    const user = await User.findOne({ where: { id: activation.user_id } })
    await user.update({ last_login: new Date(), activated: 1 })
    context.ctx.session.user = user.id
    context.me = user
    return user.getPublicData()
  },

  async updateUser(_, fields, { me }) {
    if (!me) throw new AuthenticationError('You are not authorized to edit this profile.')

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

  async unbounceUser(_, fields, { me }) {
    if (!me) throw new AuthenticationError('You are not authorized.')
    const user = await User.findByPk(me.id)
    user.bouncing = 0
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
      logger.error('SAVE_COMMENT', { error: e, user_id: me.id, postSlug })
      throw new Error('Could not save comment')
    }

    return newComment
  },


  async createPost(_, {
    title, content, status, groupId,
  }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    if (status === 'published' && !groupId) {
      throw new UserInputError('Group missing', { errors: [{ message: 'A group has to be selected' }] })
    }
    const slug = await generateSlug(Post, title)

    return Post.create({
      user_id: me.id,
      title,
      content,
      status,
      slug,
      group_id: groupId || 0,
    })
  },
  async editPost(_, args, { me }) {
    const post = await Post.findByPk(args.id)
    if (!me) throw new AuthenticationError('You must be logged in.')
    if (post.user_id !== me.id) throw new AuthenticationError('You can\'t edit some one else post.')

    post.title = args.title
    post.content = args.content
    post.status = args.status
    post.group_id = args.groupId

    await post.save()
    return post
  },


  // @TODO remove media
  deletePost(_, { id }, { me }) {
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

    const parsedFile = path.parse(filename)
    const newFilename = `${uuidv4()}${parsedFile.ext}`
    const absPath = `${UPLOADS_DIR}${me.id}/`
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
          if (err) return
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


  async deleteFile(_, { id }, { me }) {
    const media = await Media.findByPk(id)
    if (!media) throw new ApolloError('No file found')
    if (media.user_id !== me.id) throw new AuthenticationError('No, just no!')

    const filePath = path.resolve(UPLOADS_DIR, String(media.user_id), media.filename)
    try {
      await fsUnlink(filePath)
    } catch (err) {
      logger.error('DELETE_FILE_ERROR', {
        error: err, filePath, fileId: media.id, userId: me.id,
      })
    }
    await media.destroy({ force: true })

    return id
  },


  async messageReply(_, { threadId, message }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    const isSubscriber = await MessageSubscriber.findOne({
      where: { user_id: me.id, thread_id: threadId },
    })
    if (!isSubscriber) throw new AuthenticationError('You don\'t beling to this message thread.')

    return Message.create({ thread_id: threadId, user_id: me.id, message })
  },
}

module.exports = mutations
