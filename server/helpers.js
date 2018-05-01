exports.parseMessage = (message) => {
  let rawMessage = message.utf8Data

  var parsedMessage = {
    message: null,
    tags: null,
    command: null,
    original: rawMessage,
    channel: null,
    username: null
  }

  if (rawMessage[0] === '@') {
    var tagIndex = rawMessage.indexOf(' '),
      userIndex = rawMessage.indexOf(' ', tagIndex + 1),
      commandIndex = rawMessage.indexOf(' ', userIndex + 1),
      channelIndex = rawMessage.indexOf(' ', commandIndex + 1),
      messageIndex = rawMessage.indexOf(':', channelIndex + 1)

    parsedMessage.tags = rawMessage.slice(0, tagIndex)
    parsedMessage.username = rawMessage.slice(
      tagIndex + 2,
      rawMessage.indexOf('!')
    )
    parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex)
    parsedMessage.channel = rawMessage.slice(
      commandIndex + 1,
      channelIndex
    )
    parsedMessage.message = rawMessage.slice(messageIndex + 1)
  } else if (rawMessage.startsWith('PING')) {
    parsedMessage.command = 'PING'
    parsedMessage.message = rawMessage.split(':')[1]
  }

  return parsedMessage
}

exports.connectTwitch = (webSocket) => {
  webSocket.connect('wss://irc-ws.chat.twitch.tv:443/', null, null, null, null)
}

// We've attempted to fetch from redis, now let's start
exports.startServer = (activeGame, http) => {
  // Start initial game
  activeGame.start()

  http.listen(3000, () => console.log('Twitch Plays Chess listening on port 3000!'))
}
