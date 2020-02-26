const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const sharp = require('sharp')
const { v4: uuidv4 } = require('uuid')
const slugify = require('slug')
const striptags = require('striptags')
const { UserInputError, AuthenticationError, ApolloError } = require('apollo-server-koa')
const {
  Activation, User, Post, Comment, Media,
  MessageSubscriber, Message, MessageThread,
  Op,
} = require('../../models')
const createUser = require('../../mutators/createUser')
const updateEmailSubscriptions = require('./mutations/updateEmailSubscriptions')
const logger = require('../../config/logger')
const redis = require('../../config/redis')
const resetPasswordEmail = require('../../emails/resetPassword')

const fsStat = promisify(fs.stat)
const fsMkdir = promisify(fs.mkdir)
const fsUnlink = promisify(fs.unlink)

const { UPLOADS_DIR } = process.env


function invalidUserError(title = 'Invalid username or password') {
  const error = new Error(title)
  error.status = 401
  return error
}

function cleanContent(input) { return striptags(input).trim() }
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

  async forgotPassword(parent, { username }) {
    if (!username) return false

    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email: username }] } })
    if (!user) return false

    const token = uuidv4()
    await redis.set(`forgot:${token}`, user.id)
    const EXPIRE_IN_SEC = 2 * 24 * 60 * 60
    await redis.expire(`forgot:${token}`, EXPIRE_IN_SEC)

    await resetPasswordEmail(user, token)
    return true
  },
  async resetPassword(parent, { token, password }, context) {
    if (!token || !password || String(password).length < 6) return null

    const userId = await redis.get(`forgot:${token}`)
    if (!userId) return null
    const user = await User.findByPk(userId)
    if (!user) return null
    // Activate if not activated
    await user.update({ password })
    await redis.del(`forgot:${token}`)

    // Login user
    context.ctx.session.user = user.id
    return user.getPublicData()
  },

  async createUser(_, { username, email, password }, { ctx }) {
    const user = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } })
    if (user) {
      const inUse = []
      if (user.get('username').toLowerCase() === username.toLowerCase()) inUse.push('Username')
      if (user.get('email').toLowerCase() === email.toLowerCase()) inUse.push('Email')
      return { success: false, error: { message: `${inUse.join(' and ')} already in use.` } }
    }
    await createUser({ username, email, password }, ctx.request.ip)
    return { success: true }
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
    user.first_name = cleanContent(fields.firstName)
    user.last_name = cleanContent(fields.lastName)
    user.company_name = cleanContent(fields.companyName)
    user.jobtitle = cleanContent(fields.jobtitle)
    user.interests = cleanContent(fields.interests)
    user.aboutme = cleanContent(fields.aboutme)
    user.lang = fields.lang === 'fr' ? 'fr' : 'en'
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
        content: cleanContent(comment),
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
      title: cleanContent(title),
      content: cleanContent(content),
      status,
      slug,
      group_id: groupId || 0,
    })
  },
  async editPost(_, args, { me }) {
    const post = await Post.findByPk(args.id)
    if (!me) throw new AuthenticationError('You must be logged in.')
    if (post.user_id !== me.id) throw new AuthenticationError('You can\'t edit some one else post.')

    post.title = cleanContent(args.title)
    post.content = cleanContent(args.content)
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
    const chunks = []
    await new Promise((resolve, reject) => {
      stream
        .on('data', data => chunks.push(data))
        .on('end', resolve)
        .on('error', reject)
    })

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
    try {
      await fsStat(absPath)
    } catch (e) {
      await fsMkdir(absPath)
    }

    const img = await sharp(Buffer.concat(chunks))
      .resize(2500, 2500, { fit: 'inside', withoutEnlargement: true })
      .rotate()
      .toFile(newFilePath)

    mediaData.width = img.width
    mediaData.height = img.height
    mediaData.size = img.size
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


  async message(_, { users, subject, message }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    const validUsers = (users && users.length > 0)
    const sendingToSelf = users.find(userId => String(userId) === String(me.id))
    const validSubject = subject.length > 2
    const validMessage = message.length > 2
    if (!validUsers || !validSubject || !validMessage || sendingToSelf) {
      throw new UserInputError('INVALID_INPUT', {
        errors: [{ message: 'Subject and message must be minimum of 3 char and min 1 user' }],
      })
    }

    const thread = await MessageThread.create({ subject })
    await Message.create({ thread_id: thread.id, user_id: me.id, message: cleanContent(message) })
    const subscribers = users.map(userId => ({ thread_id: thread.id, user_id: userId, seen: null }))
    subscribers.push({ thread_id: thread.id, user_id: me.id, seen: new Date() })
    await MessageSubscriber.bulkCreate(subscribers)
    return { id: thread.id }
  },

  async messageReply(_, { threadId, message }, { me }) {
    if (!me) throw new AuthenticationError('You must be logged in.')
    const isSubscriber = await MessageSubscriber.findOne({
      where: { user_id: me.id, thread_id: threadId },
    })
    if (!isSubscriber) throw new AuthenticationError('You don\'t beling to this message thread.')

    return Message.create({ thread_id: threadId, user_id: me.id, message: cleanContent(message) })
  },
}

module.exports = mutations
