const chessRules = require('chess-rules')

module.exports = (io, twitchConnection, redisClient) => {
  // Object that represents our current game
  class ActiveGame {
    start () {
      // We're going to start our initial positioning
      if (!this.position) {
        // No stored game, so let's create one
        console.log('Creating initial game...')
        this.position = this.rules.getInitialPosition()
        // Store the position in redis
        redisClient.set('active_game', JSON.stringify(this.position))
      }
      if (io) {
        io.emit('active-position-update', this.position)
      }
      // If websocket is connected, let's send a message saying who's turn it is, and how much time is left
      if (twitchConnection) {
        twitchConnection.send('PRIVMSG #adventuresinprogramming' + ' : ' + " It's " + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + ' turn with 2 minutes to suggest the next move!')
      }
      this.timer = setTimeout(() => { this.decideMove() }, 60000)
    }

    decideMove () {
      let winner = null
      console.log('Deciding with data: ')
      console.log(this.proposals)
      for (let key in this.proposals) {
        console.log('Checking move: ' + key)
        if (winner == null || this.proposals[winner].length < this.proposals[key]) {
          // We have a new winner
          winner = key
        }
      }
      if (winner) {
        // We have a winner, let's submit
        let initiator = this.proposals[winner][0]
        let voteCount = this.proposals[winner].length
        // And let's slice to get the supporters
        let supporters = this.proposals[winner].slice(1)
        // Reset proposals
        twitchConnection.send('PRIVMSG #adventuresinprogramming' + ' : ' + ' Using ' + initiator + "'s " + winner + ' move for ' + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + ' turn with ' + voteCount + ' votes!')
        this.performMove(winner, initiator, supporters)
      } else {
        // Nobody suggested a move, let's re-alert the chatroom and wait again
        twitchConnection.send('PRIVMSG #adventuresinprogramming' + ' : Nobody suggested a move for  ' + (this.position.turn == 'W' ? 'White' : 'Black') + '! Another minute to get your move suggestions!')
        this.timer = setTimeout(() => { this.decideMove() }, 60000)
      }
    }

    performMove (move, username, supporters) {
      // Performs a move on our board
      let parsedMove = this.rules.pgnToMove(this.position, move)
      let side = this.position.turn
      let fullPgn = this.rules.moveToPgn(this.position, parsedMove)
      this.position = this.rules.applyMove(this.position, parsedMove)
      this.proposals = []
      // Store the position in redis
      redisClient.set('active_game', JSON.stringify(this.position))
      if (io) {
        io.emit('active-position-update', this.position)
      }
      // Now add the move to the history log
      let historyItem = {
        createdAt: new Date(),
        username: username,
        position_model: JSON.stringify(this.position),
        pgn: fullPgn,
        move: JSON.stringify(parsedMove),
        supporters: supporters
      }
      this.history.unshift(historyItem)
      // Store the position in redis
      redisClient.set('active_game_history', JSON.stringify(this.history))

      if (io) {
        io.emit('active-history-update', historyItem)
      }

      // @todo check for game completion, check, etc
      // Now announce which side turn it's on and then start the timer
      twitchConnection.send('PRIVMSG #adventuresinprogramming ' + ' : ' + " It's " + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + ' turn with a minute to suggest the next move!')
      this.timer = setTimeout(() => { this.decideMove() }, 60000)
    }

    availableMove (move) {
      // Checks to see if a provided move is available
      return this.rules.pgnToMove(this.position, move) !== null
    }
  }

  ActiveGame.position = null
  ActiveGame.history = []
  ActiveGame.timer = null
  ActiveGame.proposals = []
  ActiveGame.rules = chessRules

  return ActiveGame
}
