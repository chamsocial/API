const Redis = require('ioredis')

const port = process.env.REDIS_PORT || process.env.REDIS_SOCK || '/var/run/redis/redis.sock'
const host = process.env.REDIS_HOST || null
const client = new Redis(port, host)


module.exports = client
