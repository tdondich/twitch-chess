const { parseMessage, startServer } = require('./helpers')

module.exports = (webSocket, activeGame, app, http, config) => {
  webSocket.on('connect', (twitchConnection) => {
    app.locals.twitchConnection = twitchConnection

    activeGame.setTwitchConnection(twitchConnection)

    console.log('Twitch Chat Client Connected')
    twitchConnection.on('error', function (error) {
      console.log('Connection Error: ' + error.toString())
    })
    twitchConnection.on('close', function () {
      console.log('echo-protocol Connection Closed')
    })
    twitchConnection.on('message', function (message) {
      console.log('RECV: ' + message.utf8Data)
      let parsed = parseMessage(message)
      if (parsed.command === 'PING') {
        // Handle IRC PONG
        console.log('Sending PING reply...')
        twitchConnection.send('PONG :' + parsed.message)
      } else if (parsed.message && parsed.message.trim().indexOf('!w') === 0) {
        // It's for white!
        if (activeGame.position.turn != 'W') {
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ", it's not white's turn yet!")
          return
        }
        let tokens = parsed.message.split(' ')
        tokens.shift()
        let original = move = tokens.join(' ').trim()
        if (!move.length) {
          // Need a parameter after the space
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', you need to provide a suggested move!')
          return
        }
        // Check to see if it's in our regex format or pass it directly into availableMove
        let matches = move.match(/^([a-h][1-8]) ([a-h][1-8])$/)
        if (matches) {
          // We're actually in our new format, let's parse this into a move format, and then put that into pgn
          move = {
            src: ((parseInt(matches[1][1]) - 1) * 8) + (matches[1].charCodeAt(0) - 97),
            dst: ((parseInt(matches[2][1]) - 1) * 8) + (matches[2].charCodeAt(0) - 97)
          }
          move = activeGame.rules.moveToPgn(activeGame.position, move)
        }
        // Now check to see if it's an available move
        if (!move || !activeGame.availableMove(move)) {
          // Not an available move
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', ' + original + ' is not an available move!')
          return
        }
        // It's an available move, add to our list of moves or add as a supporter
        // Check to see if this person is in this team or not
        if(activeGame.inTeam('black', parsed.username)) {
           // This user belongs to the opposing team
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', you are a member of the Black team for this game!')
          return
        }
        // If we're here, let's add to the team members for white, if not already in it
        if(!activeGame.inTeam('white', parsed.username)) {
          activeGame.addToTeam('white', parsed.username)
        }

        let found = false;
        for(let proposedMove in activeGame.proposals) {
          if(activeGame.proposals[proposedMove].indexOf(parsed.username) !== -1) {
            found = true;
            break;
          }
        }
        if(found) {
          // They already voted!
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', you already suggested a move for this round!')
          return
        }

        if (move in activeGame.proposals) {
          // It's an existing proposal, add to the array
          activeGame.proposals[move].push(parsed.username)
          // Get the username of the person who proposed it
          let initiator = activeGame.proposals[move][0]
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + parsed.username + ' supported the move ' + move + ' proposed by ' + initiator + ' for White')
        } else {
          // It's a new move, let's add it
          activeGame.proposals[move] = [parsed.username]
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + parsed.username + ' proposed the move ' + move + ' for White')
        }
        // Perform move and update
        // activeGame.performMove(move, parsed.username, [])
        console.log(activeGame.proposals)
      } else if (parsed.message && parsed.message.trim().indexOf('!b') === 0) {
        // For black
        if (activeGame.position.turn != 'B') {
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ", it's not black's turn yet!")
          return
        }
        let tokens = parsed.message.split(' ')
        tokens.shift()
        let move = tokens.join(' ').trim()
        if (!move.length) {
          // Need a parameter after the space
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', you need to provide a suggested move!')
          return
        }
        // Check to see if it's in our regex format or pass it directly into availableMove
        let matches = move.match(/^([a-h][1-8]) ([a-h][1-8])$/)
        if (matches) {
          // We're actually in our new format, let's parse this into a move format, and then put that into pgn
          move = {
            src: ((parseInt(matches[1][1]) - 1) * 8) + (matches[1].charCodeAt(0) - 97),
            dst: ((parseInt(matches[2][1]) - 1) * 8) + (matches[2].charCodeAt(0) - 97)
          }
          move = activeGame.rules.moveToPgn(activeGame.position, move)
        }
        // Now check to see if it's an available move
        if (!move || !activeGame.availableMove(move)) {
          // Not an available move
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', ' + move + ' is not an available move!')
          return
        }
        // It's an available move, add to our list of moves or add as a supporter
        // Check to see if this person is in this team or not
        if(activeGame.inTeam('white', parsed.username)) {
           // This user belongs to the opposing team
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', you are a member of the White team for this game!')
          return
        }
        // If we're here, let's add to the team members for white, if not already in it
        if(!activeGame.inTeam('black', parsed.username)) {
          activeGame.addToTeam('black', parsed.username)
        }

        let found = false;
        for(let proposedMove in activeGame.proposals) {
          if(activeGame.proposals[proposedMove].indexOf(parsed.username) !== -1) {
            found = true;
            break;
          }
        }
        if(found) {
          // They already voted!
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + ' Hey, ' + parsed.username + ', you already suggested a move for this round!')
          return
        }


        if (move in activeGame.proposals) {
          // It's an existing proposal, add to the array
          activeGame.proposals[move].push(parsed.username)
          // Get the username of the person who proposed it
          let initiator = activeGame.proposals[move][0]
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + parsed.username + ' supported the move ' + move + ' proposed by ' + initiator + ' for Black')
        } else {
          // It's a new move, let's add it
          activeGame.proposals[move] = [parsed.username]
          twitchConnection.send('PRIVMSG ' + parsed.channel + ' : ' + parsed.username + ' proposed the move ' + move + ' for Black')
        }
        console.log(activeGame.proposals)

        // Perform move and update
        // activeGame.performMove(move, parsed.username, [])
      }
    })

    console.log('Authenticating...')

    twitchConnection.send(
      'CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership'
    )
    twitchConnection.send('PASS ' + config.bot_password)
    twitchConnection.send('NICK ' + config.bot_username)
    twitchConnection.send('JOIN ' + config.roomId)

    startServer(activeGame, http)
  })

  webSocket.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString())
  })
}
