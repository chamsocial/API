const updateEmailSubscriptions = require('./mutations/updateEmailSubscriptions')
const auth = require('./mutations/auth')
const media = require('./mutations/media')
const posts = require('./mutations/posts')
const comments = require('./mutations/comments')
const messages = require('./mutations/messages')


const mutations = {
  updateEmailSubscriptions,

  // Auth
  login: auth.login,
  forgotPassword: auth.forgotPassword,
  resetPassword: auth.resetPassword,
  createUser: auth.createUser,
  activateUser: auth.activateUser,
  updateUser: auth.updateUser,
  unbounceUser: auth.unbounceUser,

  // Media
  uploadFile: media.uploadFile,
  deleteFile: media.deleteFile,

  // Posts
  deletePost: posts.deletePost,
  createPost: posts.createPost,
  editPost: posts.editPost,

  // Comments
  createComment: comments.createComment,

  // Messages
  message: messages.message,
  messageReply: messages.messageReply,
}

module.exports = mutations
