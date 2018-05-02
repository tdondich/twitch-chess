const express = require('express')
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const env       = process.env.NODE_ENV || 'development';
const config    = require(__dirname + '/config/config.json')[env];
const WebSocketClient = require('websocket').client
let webSocket = new WebSocketClient();
const redis = require("redis")

app.use(express.static('public'))

app.locals.twitchConnection = null;

const { connectTwitch } = require('./server/helpers');

// Connect to redis
const redisClient = require('./server/redisClient')(config);

const ActiveGame = require('./server/activeGame')(io, app.locals.twitchConnection, redisClient);
const activeGame = new ActiveGame();

// see if there's an active game to fetch from redis
require('./server/redisFetch')(redisClient, activeGame, webSocket);

// socketio connection
require('./server/socketIOConnection')(io, activeGame);

// Our websocket to twitch.tv
require('./server/webSocketConnection')(webSocket, activeGame, app, http, config);
