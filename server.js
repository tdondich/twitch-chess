// Bring in express and create a instance of it
const express = require('express')
const app = express()
// Now create our http server that will wrap around express
const http = require('http').Server(app);
// Now create our socket.io server that will be bound into our express server
const io = require('socket.io')(http);
// Set our environment, defaulting to a development environment
const env       = process.env.NODE_ENV || 'development';
// Bring in our configuration file based on our environment
const config    = require(__dirname + '/config/config.json')[env];
// Our websocket client will be used to connect to twitch chat
const WebSocketClient = require('websocket').client
let webSocket = new WebSocketClient();
// Redis is used to save active game state to allow for server reloads
const redis = require("redis");

// Use our public directory for our static asset loading, which will consist of our index file
app.use(express.static('public'));

// If we're in development, let's load the webpack dev middleware which will watch for changes
// and then rerun webpack to build our dynamic assets
if(env == 'development') {
    const webpack = require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');

    // Load up our webpack configuration and compile it
    const config = require('./webpack.config.js');
    const compiler = webpack(config);

    // Tell express to use the webpack-dev-middleware and use the webpack.config.js
    // configuration file as a base.
    app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath
    }));
} else {
    app.use('/dist', express.static('dist'))
}

app.locals.twitchConnection = null;

const { connectTwitch } = require('./server/helpers');

// Connect to redis, setup retry strategy and error handling
console.log("Connecting to redis...");
const redisClient = redis.createClient({
    host: config.redis_host,
    port: config.redis_port
});
redisClient.on('error', (error) => {
    console.log(error);
    console.log("There was a problem with the redis client, terminating...");
    process.exit();

});
// Once our redis client is connected, we can initialize our active game module
redisClient.on('ready', () => {
    console.log("Redis connected, initializing our active game.");
});

const ActiveGame = require('./server/activeGame')(io, app.locals.twitchConnection, redisClient);
const activeGame = new ActiveGame();

// see if there's an active game to fetch from redis
require('./server/redisFetch')(redisClient, activeGame, webSocket);

// socketio connection
require('./server/socketIOConnection')(io, activeGame);

// Our websocket to twitch.tv
require('./server/webSocketConnection')(webSocket, activeGame, app, http, config);

