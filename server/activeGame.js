const chessRules = require('chess-rules')

module.exports = (config, io, twitchConnection, redisClient) => {
  // Object that represents our current game
  class ActiveGame {

    constructor() {
      this.position = null
      this.history = []
      this.timer = null
      this.proposals = []
      this.rules = chessRules
      this.teams = {
        black: [],
        white: []
      }
    }

    start() {
      // We're going to start our initial positioning
      if (!this.position) {
        // No stored game, so let's create one
        console.log('Creating initial game...')
        this.position = this.rules.getInitialPosition()
       this.history = [];
        this.teams = {
          white: [],
          black: []
        };
        this.proposals = []
        // Store the position in redis
        redisClient.set('active_game', JSON.stringify(this.position))
        redisClient.set('active_game_teams', JSON.stringify(this.teams))
        redisClient.set('active_game_history', JSON.stringify(this.history))
      }
      if (io) {
        io.emit('active-position-update', this.position)
        io.emit('active-history-full', this.history)
        io.emit('active-teams-update', this.teams)
      }
      // If websocket is connected, let's send a message saying who's turn it is, and how much time is left
      if (this.twitchConnection) {
        this.twitchConnection.send('PRIVMSG ' + config.roomId + ' : ' + " It's " + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + ' turn with 45 seconds to suggest the next move!')
      }
      this.timer = setTimeout(() => { this.decideMove() }, 45000)
    }

    setTwitchConnection(connection) {
      this.twitchConnection = connection
    }

    /**
     * Returns a boolean if the username is already a member of a requested team 
     * @param {*} team 
     * @param {*} username 
     */
    inTeam(team, username) {
      return this.teams[team].indexOf(username) !== -1
    }

    addToTeam(team, username) {
      if (!this.inTeam(team, username)) {
        this.teams[team].push(username)
        // Now broadcast updated roster to socket.io connected clients
        if (io) {
          io.emit('active-teams-update', this.teams)
        }
        // Save in redis
        redisClient.set('active_game_teams', JSON.stringify(this.teams))
      }
    }

    decideMove() {
      let winner = null
      for (let key in this.proposals) {
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
        this.twitchConnection.send('PRIVMSG ' + config.roomId + ' : ' + ' Using ' + initiator + "'s " + winner + ' move for ' + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + ' turn with ' + voteCount + ' votes!')
        this.performMove(winner, initiator, supporters)
      } else {
        // Nobody suggested a move, let's re-alert the chatroom and wait again
        this.twitchConnection.send('PRIVMSG ' + config.roomId + ' : Nobody suggested a move for  ' + (this.position.turn == 'W' ? 'White' : 'Black') + '! Another 45 seconds to get your move suggestions!')
        this.timer = setTimeout(() => { this.decideMove() }, 45000)
      }
    }

    performMove(move, username, supporters) {
      // Performs a move on our board
      let parsedMove = this.rules.pgnToMove(this.position, move)
      let fullPgn = this.rules.moveToPgn(this.position, parsedMove)
      let turn = this.position.turn;
      this.position = this.rules.applyMove(this.position, parsedMove)
      this.proposals = []
      // Store the position in redis
      redisClient.set('active_game', JSON.stringify(this.position))
      if (io) {
        io.emit('active-position-update', this.position)
      }
      // Now add the move to the history log
      let historyItem = {
        turn: turn,
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

      // Check for game completion
      if (['WHITEWON', 'BLACKWON', 'PAT'].indexOf(this.rules.getGameStatus(this.position)) !== -1) {
        // Our game is finished! Let's tally up points and send a scoreboard
        let scores = this.calculateScoreboard(this.rules.getGameStatus(this.position)[0])
        // Send the scoreboard to the socketio
        io.emit('active-scoreboard-update', scores)

        if(this.rules.getGameStatus(this.position) !== 'PAT') {
          this.twitchConnection.send('PRIVMSG  ' + config.roomId + ' : ' + " Congratulations to the " + (this.position.turn == 'B' ? 'White' : 'Black') + ' team for winning! A new game is starting soon...')
        } else {
          this.twitchConnection.send('PRIVMSG  ' + config.roomId + ' : It\s a stalemate! A new game is starting soon...')
        }

        // Set timer to reset everything
        setTimeout(() => {
          this.position = null,
          this.start()
        }, 60000)

      } else {
        // Now announce which side turn it's on and then start the timer
        this.twitchConnection.send('PRIVMSG  ' + config.roomId +  ' : ' + " It's " + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + ' turn with 45 seconds to suggest the next move!')
        this.timer = setTimeout(() => { this.decideMove() }, 45000)
      }
    }

    calculateScoreboard(side) {
      let scores = []
      for (let historyItem of this.history) {
        // This is for the winning team
        if(historyItem.turn !== side) {
          continue
        }
        // iterate through array
        let item = null;
        for (let score of scores) {
          if (score.username == historyItem.username) {
            item = score;
          }
        }
        if (!item) {
          scores.push({
            username: historyItem.username,
            points: 2
          })
        } else {
          item.points += 2
        }

        if (historyItem.supporters) {
          for (let supporter of historyItem.supporters) {
            let item = null;
            for (let score of scores) {
              if (score.username == supporter) {
                item = score;
              }
            }
            if (!item) {
              scores.push({
                username: supporter,
                points: 1
              })
            } else {
              item.points += 1
            }
          }
        }
      }
      // Sort
      scores.sort(function(a,b) {
        if(a.points < b.points) {
          return 1;
        } else if(a.points === b.points) {
          return 0;
        }
        return -1;
      });
      return scores;
    }

    availableMove(move) {
      // Checks to see if a provided move is available
      return this.rules.pgnToMove(this.position, move) !== null
    }
  }

  return ActiveGame
}
