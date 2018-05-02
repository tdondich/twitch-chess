// Connect to redis, and see if there's an active game to fetch
const redis = require('redis')

module.exports = (config) => redis.createClient({
  host: config.redis_host,
  port: config.redis_port
})
