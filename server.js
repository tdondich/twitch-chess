var express = require('express')
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var env       = process.env.NODE_ENV || 'development';
var config    = require(__dirname + '/config/config.json')[env];

var WebSocketClient = require('websocket').client

app.use(express.static('public'))

io.on('connection', function(socket){
    console.log('a user connected');
  });

http.listen(3000, () => console.log('Example app listening on port 3000!'))

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
        console.log("Received: '" + message.utf8Data + "'");
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
webSocket.connect("wss://irc-ws.chat.twitch.tv:443/", null, null, null, null);






