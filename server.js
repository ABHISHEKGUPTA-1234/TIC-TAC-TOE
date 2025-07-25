const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on('ready', () => {
    console.log(`${socket.id} is ready to play`);

    if (waitingPlayer) {
      const room = `room-${waitingPlayer.id}`;

      socket.join(room);
      waitingPlayer.join(room);

      socket.emit('gameStart', { symbol: 'O' });
      waitingPlayer.emit('gameStart', { symbol: 'X' });
      io.to(room).emit('room', room);

      console.log(`Room created: ${room} with ${waitingPlayer.id} and ${socket.id}`);
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      console.log(`Waiting for second player: ${socket.id}`);
    }
  });

  socket.on('move', ({ index, room }) => {
    console.log(`Move in ${room}: ${index}`);
    socket.to(room).emit('opponentMove', index);
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    rooms.forEach(room => {
      socket.to(room).emit('opponentDisconnected');
      console.log(` ${socket.id} disconnected from ${room}`);
    });
  });

  socket.on('disconnect', () => {
    if (waitingPlayer === socket) waitingPlayer = null;
    console.log(` User disconnected: ${socket.id}`);
  });
});

server.listen(3000, () => {
  console.log(' Server running on http://localhost:3000');
});
