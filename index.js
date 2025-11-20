const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameManager = require('./gameManager');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Use environment PORT or default to 3001
const PORT = process.env.PORT || 3001;

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    }
});

const gameManager = new GameManager();

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'El Impostor Server is running', rooms: gameManager.getRoomCount() });
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Create room
    socket.on('create-room', (playerName, callback) => {
        const roomCode = gameManager.createRoom(socket.id, playerName);
        socket.join(roomCode);
        callback({ success: true, roomCode, playerName });
        console.log(`Room created: ${roomCode} by ${playerName}`);
    });

    // Join room
    socket.on('join-room', ({ roomCode, playerName }, callback) => {
        const result = gameManager.joinRoom(roomCode, socket.id, playerName);
        if (result.success) {
            socket.join(roomCode);
            // Notify all players in room
            io.to(roomCode).emit('room-update', gameManager.getRoomState(roomCode));
            callback({ success: true });
            console.log(`${playerName} joined room ${roomCode}`);
        } else {
            callback({ success: false, error: result.error });
        }
    });

    // Start game
    socket.on('start-game', (roomCode, callback) => {
        const result = gameManager.startGame(roomCode, socket.id);
        if (result.success) {
            // Send each player their individual role
            const room = gameManager.getRoom(roomCode);
            room.players.forEach(player => {
                io.to(player.socketId).emit('game-started', {
                    role: player.role,
                    word: player.word,
                    gameState: room.gameState
                });
            });
            callback({ success: true });
            console.log(`Game started in room ${roomCode}`);
        } else {
            callback({ success: false, error: result.error });
        }
    });

    // Player vote
    socket.on('vote', ({ roomCode, accusedPlayerId }, callback) => {
        const result = gameManager.registerVote(roomCode, socket.id, accusedPlayerId);
        if (result.success) {
            io.to(roomCode).emit('vote-registered', { voterId: socket.id });

            // Check if all votes are in
            if (result.allVotesIn) {
                io.to(roomCode).emit('game-ended', result.gameResult);
            }
            callback({ success: true });
        } else {
            callback({ success: false, error: result.error });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const roomCode = gameManager.removePlayer(socket.id);
        if (roomCode) {
            io.to(roomCode).emit('room-update', gameManager.getRoomState(roomCode));
            console.log(`Player ${socket.id} disconnected from room ${roomCode}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
