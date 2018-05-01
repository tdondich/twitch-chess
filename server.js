const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const env       = process.env.NODE_ENV || 'development';
const config    = require(__dirname + '/config/config.json')[env];
const WebSocketClient = require('websocket').client
const redis = require("redis")

let twitchConnection = null

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
    timer: null,
    proposals: [],
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
        // If websocket is connected, let's send a message saying who's turn it is, and how much time is left
        if(twitchConnection) {
            twitchConnection.send("PRIVMSG #adventuresinprogramming"  + " : " + " It's " + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + " turn with 2 minutes to suggest the next move!");
        }
        this.timer = setTimeout(() => {this.decideMove() }, 60000)
    },
    decideMove() {
        let winner = null;
        console.log("Deciding with data: ")
        console.log(this.proposals)
        for(let key in this.proposals) {
            console.log('Checking move: ' + key)
            if(winner == null || this.proposals[winner].length < this.proposals[key]) {
                // We have a new winner
                winner = key
            }
        }
        if(winner) {
            // We have a winner, let's submit
            let initiator = this.proposals[winner][0];
            let voteCount = this.proposals[winner].length;
            // And let's slice to get the supporters
            let supporters = this.proposals[winner].slice(1);
            // Reset proposals
            twitchConnection.send("PRIVMSG #adventuresinprogramming"  + " : " + " Using " + initiator + "'s " + winner + " move for " + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + " turn with " + voteCount + " votes!");
            activeGame.performMove(winner, initiator, supporters)
        } else {
            // Nobody suggested a move, let's re-alert the chatroom and wait again
            twitchConnection.send("PRIVMSG #adventuresinprogramming" + " : Nobody suggested a move for  " + (this.position.turn == 'W' ? 'White' : 'Black') + "! Another minute to get your move suggestions!");
            this.timer = setTimeout(() => {this.decideMove() }, 60000)
        }
    },
    performMove(move, username, supporters) {
        // Performs a move on our board
        let parsedMove = this.rules.pgnToMove(this.position, move)
        let side = this.position.turn
        let fullPgn = this.rules.moveToPgn(this.position, parsedMove)
        this.position = this.rules.applyMove(this.position, parsedMove)
        this.proposals = [];
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
            move: JSON.stringify(parsedMove),
            supporters: supporters
        }
        this.history.unshift(historyItem);
        // Store the position in redis
        redisClient.set('active_game_history', JSON.stringify(this.history))
 
        if(io) {
            io.emit('active-history-update', historyItem)
        }

        // @todo check for game completion, check, etc
        // Now announce which side turn it's on and then start the timer
        twitchConnection.send("PRIVMSG #adventuresinprogramming " + " : " + " It's " + (this.position.turn == 'W' ? 'White\'s' : 'Black\'s') + " turn with a minute to suggest the next move!");
        this.timer = setTimeout(() => {this.decideMove() }, 60000)
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
        connectTwitch()
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
        connectTwitch()

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
    twitchConnection = connection
    console.log('Twitch Chat Client Connected');
   twitchConnection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    twitchConnection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    twitchConnection.on('message', function(message) {
        console.log("RECV: " + message.utf8Data)
        let parsed = parseMessage(message)
        if (parsed.command === "PING") {
            // Handle IRC PONG
            console.log("Sending PING reply...")
            twitchConnection.send("PONG :" + parsed.message);
        } else if(parsed.message && parsed.message.trim().indexOf('!w') === 0) {
            // It's for white!
            if(activeGame.position.turn != 'W') {
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", it's not white's turn yet!");
                return;
            }
            let tokens = parsed.message.split(" ");
            tokens.shift()
            let original = move = tokens.join(' ').trim()
            if(!move.length) {
                // Need a parameter after the space
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", you need to provide a suggested move!");
                return;
            }
            // Check to see if it's in our regex format or pass it directly into availableMove
            let matches = move.match(/^([a-h][1-8]) ([a-h][1-8])$/)
            if(matches) {
                // We're actually in our new format, let's parse this into a move format, and then put that into pgn
                move = {
                    src: ((parseInt(matches[1][1]) - 1) * 8) + (matches[1].charCodeAt(0)-97),
                    dst: ((parseInt(matches[2][1]) - 1) * 8) + (matches[2].charCodeAt(0)-97)
                }
                move = activeGame.rules.moveToPgn(activeGame.position, move)
            }
            // Now check to see if it's an available move
            if(!move || !activeGame.availableMove(move)) {
                // Not an available move
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", " + original + " is not an available move!");
                return;
            }
            // It's an available move, add to our list of moves or add as a supporter
            // @todo Check to see if this person already proposed or supported a move
            if(move in activeGame.proposals) {
                // It's an existing proposal, add to the array
                activeGame.proposals[move].push(parsed.username)
                // Get the username of the person who proposed it
                let initiator = activeGame.proposals[move][0]
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + parsed.username + " supported the move " + move + " proposed by " + initiator + " for White");
           } else {
                // It's a new move, let's add it
                activeGame.proposals[move] = [parsed.username]
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + parsed.username + " proposed the move " + move + " for White");
            }
            // Perform move and update
            //activeGame.performMove(move, parsed.username, [])
            console.log(activeGame.proposals)

        } else if(parsed.message && parsed.message.trim().indexOf('!b') === 0) {
            // For black
            if(activeGame.position.turn != 'B') {
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", it's not black's turn yet!");
                return;
            }
            let tokens = parsed.message.split(" ");
            tokens.shift()
            let move = tokens.join(' ').trim()
            if(!move.length) {
                // Need a parameter after the space
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", you need to provide a suggested move!");
                return;
            }
            // Check to see if it's in our regex format or pass it directly into availableMove
            let matches = move.match(/^([a-h][1-8]) ([a-h][1-8])$/)
            if(matches) {
                // We're actually in our new format, let's parse this into a move format, and then put that into pgn
                move = {
                    src: ((parseInt(matches[1][1]) - 1) * 8) + (matches[1].charCodeAt(0)-97),
                    dst: ((parseInt(matches[2][1]) - 1) * 8) + (matches[2].charCodeAt(0)-97)
                }
                console.log("Attempting to parse: ")
                console.log(move)
                move = activeGame.rules.moveToPgn(activeGame.position, move)
            }
            // Now check to see if it's an available move
            if(!move || !activeGame.availableMove(move)) {
                // Not an available move
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + " Hey, " + parsed.username + ", " + move + " is not an available move!");
                return;
            }
            // It's an available move, add to our list of moves or add as a supporter
            // @todo Check to see if this person already proposed or supported a move
            if(move in activeGame.proposals) {
                // It's an existing proposal, add to the array
                activeGame.proposals[move].push(parsed.username)
                // Get the username of the person who proposed it
                let initiator = activeGame.proposals[move][0]
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + parsed.username + " supported the move " + move + " proposed by " + initiator + " for Black");
           } else {
                // It's a new move, let's add it
                activeGame.proposals[move] = [parsed.username]
                twitchConnection.send("PRIVMSG " + parsed.channel + " : " + parsed.username + " proposed the move " + move + " for Black");
            }
            console.log(activeGame.proposals)

            // Perform move and update
            //activeGame.performMove(move, parsed.username, [])
        }
    });

    console.log("Authenticating...");

    twitchConnection.send(
        "CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"
    );
    twitchConnection.send("PASS " + config.bot_password);
    twitchConnection.send("NICK " + config.bot_username);
    twitchConnection.send('JOIN #adventuresinprogramming')

    startServer()

})
webSocket.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

function connectTwitch() {
    webSocket.connect("wss://irc-ws.chat.twitch.tv:443/", null, null, null, null);
}

// We've attempted to fetch from redis, now let's start
function startServer() {
    // Start initial game
    activeGame.start()

    http.listen(3000, () => console.log('Twitch Plays Chess listening on port 3000!'))
}




