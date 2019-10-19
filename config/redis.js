const redis = require('redis')

const port = process.env.REDIS_PORT || process.env.REDIS_SOCK || '/var/run/redis/redis.sock'
const host = process.env.REDIS_HOST || null
const client = redis.createClient(port, host)

// Prevent from crashing the app?
client.on('error', err => {
  console.log(`Redis error API: ${err}`)
})

module.exports = client
