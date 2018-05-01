const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const env       = process.env.NODE_ENV || 'development';
const config    = require(__dirname + '/config/config.json')[env];
const WebSocketClient = require('websocket').client
const redis = require("redis")



function parseMessage(message) {
    let rawMessage = message.utf8Data

    var parsedMessage = {
    message: null,
    tags: null,
    command: null,
    original: rawMessage,
    channel: null,
    username: null
    };

    if (rawMessage[0] === "@") {
    var tagIndex = rawMessage.indexOf(" "),
        userIndex = rawMessage.indexOf(" ", tagIndex + 1),
        commandIndex = rawMessage.indexOf(" ", userIndex + 1),
        channelIndex = rawMessage.indexOf(" ", commandIndex + 1),
        messageIndex = rawMessage.indexOf(":", channelIndex + 1);

    parsedMessage.tags = rawMessage.slice(0, tagIndex);
    parsedMessage.username = rawMessage.slice(
        tagIndex + 2,
        rawMessage.indexOf("!")
    );
    parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
    parsedMessage.channel = rawMessage.slice(
        commandIndex + 1,
        channelIndex
    );
    parsedMessage.message = rawMessage.slice(messageIndex + 1);
    } else if (rawMessage.startsWith("PING")) {
    parsedMessage.command = "PING";
    parsedMessage.message = rawMessage.split(":")[1];
    }

    return parsedMessage;
}


// Object that represents our current game
let activeGame = {
    position: null,
    history: [],
    rules: require("chess-rules"),
    start() {
        // We're going to start our initial positioning
        if(!this.position) {
            // No stored game, so let's create one
            console.log("Creating initial game...")
            this.position = this.rules.getInitialPosition()
            // Store the position in redis
            redisClient.set('active_game', JSON.stringify(this.position))
        }
        if(io) {
            io.emit('active-position-update', this.position)
        }
    },
    performMove(move, username, supporters) {
        // Performs a move on our board
        let parsedMove = this.rules.pgnToMove(this.position, move)
        let side = this.position.turn
        let fullPgn = this.rules.moveToPgn(this.position, parsedMove)
        this.position = this.rules.applyMove(this.position, parsedMove)
        // Store the position in redis
        redisClient.set('active_game', JSON.stringify(this.position))
        if(io) {
            io.emit('active-position-update', this.position)
        }
        // Now add the move to the history log
        let historyItem = {
            createdAt: new Date(),
            username: username,
            position_model: JSON.stringify(this.position),
            pgn: fullPgn,
            move: JSON.stringify(parsedMove)
        }
        this.history.unshift(historyItem);
        // Store the position in redis
        redisClient.set('active_game_history', JSON.stringify(this.history))
 
        if(io) {
            io.emit('active-history-update', historyItem)
        }
    },
    availableMove(move) {
        // Checks to see if a provided move is available
        return this.rules.pgnToMove(this.position,move) !== null
    }
};

// Connect to redis, and see if there's an active game to fetch
const redisClient = redis.createClient({
    host: config.redis_host,
    port: config.redis_port
});

redisClient.get("active_game", function (err, reply) {
    if(err || reply === null) {
        console.log("No data available, not populating activeGame")
        // No data or error, go ahead and start
        startServer()
        return
    }
    // If not an error, we have an active game
    console.log("Retrieved game state from redis, populating...")
    let storedGame = JSON.parse(reply)
    // Also fetch history
    redisClient.get('active_game_history', function (err, reply) {
        activeGame.position = storedGame
        if(reply !== null) {
            activeGame.history = JSON.parse(reply)
        } else {
            activeGame.history = []
        }
        startServer()
        return
    })

});



app.use(express.static('public'))

io.on('connection', function(socket){
    console.log('a user connected');
    socket.emit('active-position-update', activeGame.position)
    socket.emit('active-history-full', activeGame.history)
  });



// Our websocket to twitch.tv
let webSocket = new WebSocketClient();

webSocket.on('connect', (connection) => {
    console.log('Twitch Chat Client Connected');
   connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        console.log("RECV: " + message.utf8Data)
        let parsed = parseMessage(message)
        if (parsed.command === "PING") {
            // Handle IRC PONG
            console.log("Sending PING reply...")
            connection.send("PONG :" + parsed.message);
        } else if(parsed.message && parsed.message.trim().indexOf('!w') === 0) {
            // It's for white!
            if(activeGame.position.turn != 'W') {
                connection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", it's not white's turn yet!");
                return;
            }
            let tokens = parsed.message.split(" ");
            tokens.shift()
            let move = tokens.join(' ').trim()
            if(!move.length) {
                // Need a parameter after the space
                connection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", you need to provide a suggested move!");
                return;
            }
            // Now check to see if it's an available move
            if(!activeGame.availableMove(move)) {
                // Not an available move
                connection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", " + move + " is not an available move!");
                return;
            }
            // Perform move and update
            activeGame.performMove(move, parsed.username, [])
        } else if(parsed.message && parsed.message.trim().indexOf('!b') === 0) {
            // For black
            if(activeGame.position.turn != 'B') {
                connection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", it's not black's turn yet!");
                return;
            }
            let tokens = parsed.message.split(" ");
            tokens.shift()
            let move = tokens.join(' ').trim()
            if(!move.length) {
                // Need a parameter after the space
                connection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", you need to provide a suggested move!");
                return;
            }
            // Now check to see if it's an available move
            if(!activeGame.availableMove(move)) {
                // Not an available move
                connection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", " + move + " is not an available move!");
                return;
            }
            // Perform move and update
            activeGame.performMove(move, parsed.username, [])
        }
    });

    console.log("Authenticating...");

    connection.send(
        "CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"
    );
    connection.send("PASS " + config.bot_password);
    connection.send("NICK " + config.bot_username);
    connection.send('JOIN #adventuresinprogramming')

})
webSocket.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

// We've attempted to fetch from redis, now let's start
function startServer() {
    // Start initial game
    activeGame.start()
    webSocket.connect("wss://irc-ws.chat.twitch.tv:443/", null, null, null, null);

    http.listen(3000, () => console.log('Twitch Plays Chess listening on port 3000!'))
}




