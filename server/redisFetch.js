const { connectTwitch } = require('./helpers')
module.exports = (redisClient, activeGame, webSocket) => {
  redisClient.get('active_game', function (err, reply) {
    if (err || reply === null) {
      console.log('No data available, not populating activeGame')
      // No data or error, go ahead and start
      connectTwitch(webSocket)
      return
    }
    // If not an error, we have an active game
    console.log('Retrieved game state from redis, populating...')
    let storedGame = JSON.parse(reply)
    // Also fetch history
    redisClient.get('active_game_history', function (err, reply) {
      activeGame.position = storedGame
      if (reply !== null) {
        activeGame.history = JSON.parse(reply)
      } else {
        activeGame.history = []
      }
      connectTwitch(webSocket)
    })
  })
}
