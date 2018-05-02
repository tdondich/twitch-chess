module.exports = (io, activeGame) => {
  io.on('connection', function (socket) {
    console.log('a user connected')
    socket.emit('active-position-update', activeGame.position)
    socket.emit('active-history-full', activeGame.history)
    socket.emit('active-teams-update', activeGame.teams)
  })
}
