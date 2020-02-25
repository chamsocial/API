const { v4: uuidv4 } = require('uuid')
const mailgun = require('../config/mailgun')
const logger = require('../config/logger')
const { User, Activation } = require('../models')

function sendEmail(user, activationCode) {
  const url = `${process.env.HOME_URL}/users/activate/${activationCode}`

  // Send an activation email
  const data = {
    from: 'Chamsocial <activation@noreply.chamsocial.com>',
    to: user.email,
    subject: 'Activate account - Chamsocial',
    text: `
      Welcome to Chamsocial, ${user.username}

      Your Chamsocial signup is almost complete.

      Please visit the link to activate your account:
      ${url}
    `,
  }

  return mailgun.messages().send(data, error => {
    if (error) logger.error('Mailgin error:', error)
  })
}

async function createUser(values, ip) {
  const user = await User.create(values)
  const code = uuidv4()
  await Activation.create({
    user_id: user.id,
    code,
    create_ip: ip,
  })
  sendEmail(user, code)
  return user
}

module.exports = createUser
