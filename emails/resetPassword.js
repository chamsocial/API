const mailgun = require('../config/mailgun')


function sendActivationEmail(user, token) {
  const { username, email } = user
  const url = `${process.env.HOME_URL}/reset-password/${token}`

  // Send an activation email
  const data = {
    from: 'Chamsocial <reset_password@noreply.chamsocial.com>',
    to: email,
    subject: 'Reset my password - Chamsocial',
    text: `
      Reset the password for ${username}

      We received a request to reset your password.
      If you didn't request it, please ignore this email.

      Visit the link to reset your password:
      ${url}
    `,
  }

  return mailgun
    .messages()
    .send(data)
    .catch(error => {
      throw new Error(`Failed to send email to ${user.get('email')} | ${error.message}`)
    })
}


module.exports = sendActivationEmail
