const jwt = require('jsonwebtoken')
const { JWT_SECRET, JWT_EXPIRE } = process.env

function generateJWT (user) {
  return jwt.sign({ id: user.id, slug: user.slug }, JWT_SECRET, { expiresIn: JWT_EXPIRE })
}

module.exports = {
  generateJWT
}
