class Room {
    constructor(hostSocketId, hostName) {
        this.code = this.generateCode();
        this.hostSocketId = hostSocketId;
        this.players = [{
            socketId: hostSocketId,
            name: hostName,
            isHost: true,
            role: null,
            word: null,
            hasVoted: false,
            eliminated: false,
            roleConfirmed: false
        }];
        this.gameState = 'waiting'; // waiting, playing, voting, ended
        this.currentWord = null;
        this.impostorId = null;
        this.votes = {};

        // New properties for online enhancements
        this.turnHistory = []; // {playerId, playerName, word, turnNumber}
        this.currentTurn = 0;
        this.chatMessages = []; // {playerName, text, timestamp}
        this.roundNumber = 1;
    }

    generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    addPlayer(socketId, name) {
        this.players.push({
            socketId,
            name,
            isHost: false,
            role: null,
            word: null,
            hasVoted: false,
            eliminated: false,
            roleConfirmed: false
        });
    }

    removePlayer(socketId) {
        this.players = this.players.filter(p => p.socketId !== socketId);

        // If host left, assign new host
        if (this.players.length > 0 && !this.players.find(p => p.isHost)) {
            this.players[0].isHost = true;
            this.hostSocketId = this.players[0].socketId;
        }

        return this.players.length === 0;
    }

    startGame(customWords = []) {
        if (this.players.length < 3) {
            return { success: false, error: 'Need at least 3 players' };
        }

        // Pick random word
        const words = [
            'Perro', 'Gato', 'Pizza', 'Playa', 'Montaña',
            'Coche', 'Avión', 'Mesa', 'Silla', 'Ordenador',
            ...customWords
        ];
        this.currentWord = words[Math.floor(Math.random() * words.length)];

        // Pick impostor
        const impostorIndex = Math.floor(Math.random() * this.players.length);
        this.impostorId = this.players[impostorIndex].socketId;

        // Assign roles
        this.players.forEach((player, index) => {
            if (index === impostorIndex) {
                player.role = 'impostor';
                player.word = null;
            } else {
                player.role = 'citizen';
                player.word = this.currentWord;
            }
        });

        this.gameState = 'playing';
        return { success: true };
    }

    registerVote(voterId, accusedId) {
        const voter = this.players.find(p => p.socketId === voterId);
        if (!voter || voter.hasVoted) {
            return { success: false, error: 'Invalid vote' };
        }

        voter.hasVoted = true;
        this.votes[voterId] = accusedId;

        // Check if all votes are in
        const allVoted = this.players.every(p => p.hasVoted);

        if (allVoted) {
            return {
                success: true,
                allVotesIn: true,
                gameResult: this.calculateResults()
            };
        }

        return { success: true, allVotesIn: false };
    }

    calculateResults() {
        // Count votes
        const voteCounts = {};
        Object.values(this.votes).forEach(accusedId => {
            voteCounts[accusedId] = (voteCounts[accusedId] || 0) + 1;
        });

        // Find most voted
        let maxVotes = 0;
        let accusedId = null;
        Object.entries(voteCounts).forEach(([id, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                accusedId = id;
            }
        });

        const winner = accusedId === this.impostorId ? 'citizens' : 'impostor';
        const impostorName = this.players.find(p => p.socketId === this.impostorId)?.name;

        this.gameState = 'ended';

        return {
            winner,
            impostorId: this.impostorId,
            impostorName,
            accusedId,
            votes: this.votes,
            word: this.currentWord
        };
    }

    // New methods for online mode enhancements
    submitWord(playerId, word) {
        const activePlayers = this.players.filter(p => !p.eliminated);
        const currentPlayer = activePlayers[this.currentTurn];

        if (!currentPlayer || currentPlayer.socketId !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        if (!word || word.trim().length === 0 || word.length > 50) {
            return { success: false, error: 'Invalid word length' };
        }

        // Save word to history
        this.turnHistory.push({
            playerId,
            playerName: currentPlayer.name,
            word: word.trim(),
            turnNumber: this.currentTurn,
            roundNumber: this.roundNumber
        });

        // Advance turn
        this.currentTurn++;

        // Check if round is complete
        if (this.currentTurn >= activePlayers.length) {
            // Round complete, go to voting
            this.gameState = 'voting';
            return { success: true, action: 'voting', history: this.turnHistory };
        }

        // Next turn
        const nextPlayer = activePlayers[this.currentTurn];
        return {
            success: true,
            action: 'next',
            nextPlayerId: nextPlayer.socketId,
            nextPlayerName: nextPlayer.name,
            turnNumber: this.currentTurn,
            history: this.turnHistory
        };
    }

    addChatMessage(playerName, text) {
        if (!text || text.trim().length === 0 || text.length > 200) {
            return { success: false, error: 'Invalid message' };
        }

        const message = {
            playerName,
            text: text.trim(),
            timestamp: Date.now()
        };

        this.chatMessages.push(message);
        return { success: true, message };
    }

    submitVoteOnline(voterId, accusedId) {
        const voter = this.players.find(p => p.socketId === voterId && !p.eliminated);
        if (!voter) {
            return { success: false, error: 'Invalid voter' };
        }

        if (voter.hasVoted) {
            return { success: false, error: 'Already voted' };
        }

        voter.hasVoted = true;
        this.votes[voterId] = accusedId;

        // Check if all active players have voted
        const activePlayers = this.players.filter(p => !p.eliminated);
        const allVoted = activePlayers.every(p => p.hasVoted);

        if (allVoted) {
            return {
                success: true,
                allVotesIn: true,
                result: this.calculateMajorityVote()
            };
        }

        return {
            success: true,
            allVotesIn: false,
            votesCount: Object.keys(this.votes).length,
            totalCount: activePlayers.length
        };
    }

    calculateMajorityVote() {
        // Count votes
        const voteCounts = {};
        Object.values(this.votes).forEach(accusedId => {
            voteCounts[accusedId] = (voteCounts[accusedId] || 0) + 1;
        });

        // Find most voted
        let maxVotes = 0;
        let eliminatedId = null;
        Object.entries(voteCounts).forEach(([id, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                eliminatedId = id;
            }
        });

        // Eliminate player
        let eliminatedName = null;
        if (eliminatedId) {
            const player = this.players.find(p => p.socketId === eliminatedId);
            if (player) {
                player.eliminated = true;
                eliminatedName = player.name;
            }
        }

        // Check game over
        const gameOver = this.checkGameOver();

        // Reset for next round
        this.players.forEach(p => p.hasVoted = false);
        this.votes = {};
        this.currentTurn = 0;
        this.roundNumber++;

        if (!gameOver) {
            this.gameState = 'playing';
        } else {
            this.gameState = 'ended';
        }

        return {
            voteCounts,
            eliminatedId,
            eliminatedName,
            gameOver: gameOver,
            winner: gameOver ? gameOver.winner : null,
            impostorId: gameOver ? this.impostorId : null,
            impostorName: gameOver ? this.players.find(p => p.socketId === this.impostorId)?.name : null
        };
    }

    checkGameOver() {
        const activePlayers = this.players.filter(p => !p.eliminated);
        const impostor = activePlayers.find(p => p.role === 'impostor');

        // Impostor eliminated = citizens win
        if (!impostor) {
            return { winner: 'citizens' };
        }

        // Only 2 players left (impostor and 1 citizen) = impostor wins
        if (activePlayers.length <= 2) {
            return { winner: 'impostor' };
        }

        return null;
    }

    confirmRole(playerId) {
        const player = this.players.find(p => p.socketId === playerId);
        if (!player) {
            return { success: false, error: 'Player not found' };
        }

        player.roleConfirmed = true;

        // Check if all players have confirmed
        const allConfirmed = this.players.every(p => p.roleConfirmed);

        return {
            success: true,
            allConfirmed,
            confirmedCount: this.players.filter(p => p.roleConfirmed).length,
            totalCount: this.players.length
        };
    }

    getState() {
        return {
            code: this.code,
            players: this.players.map(p => ({
                socketId: p.socketId,
                name: p.name,
                isHost: p.isHost
            })),
            gameState: this.gameState,
            playerCount: this.players.length
        };
    }
}

class GameManager {
    constructor() {
        this.rooms = new Map();
        this.playerToRoom = new Map();
    }

    createRoom(socketId, playerName) {
        const room = new Room(socketId, playerName);
        this.rooms.set(room.code, room);
        this.playerToRoom.set(socketId, room.code);
        return room.code;
    }

    joinRoom(roomCode, socketId, playerName) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        if (room.gameState !== 'waiting') {
            return { success: false, error: 'Game already started' };
        }
        if (room.players.length >= 10) {
            return { success: false, error: 'Room is full' };
        }

        room.addPlayer(socketId, playerName);
        this.playerToRoom.set(socketId, roomCode);
        return { success: true };
    }

    startGame(roomCode, hostSocketId) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        if (room.hostSocketId !== hostSocketId) {
            return { success: false, error: 'Only host can start game' };
        }

        return room.startGame();
    }

    registerVote(roomCode, voterId, accusedId) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        return room.registerVote(voterId, accusedId);
    }

    removePlayer(socketId) {
        const roomCode = this.playerToRoom.get(socketId);
        if (!roomCode) return null;

        const room = this.rooms.get(roomCode);
        if (!room) return null;

        const isEmpty = room.removePlayer(socketId);
        this.playerToRoom.delete(socketId);

        if (isEmpty) {
            this.rooms.delete(roomCode);
        }

        return roomCode;
    }

    getRoom(roomCode) {
        return this.rooms.get(roomCode);
    }

    getRoomState(roomCode) {
        const room = this.rooms.get(roomCode);
        return room ? room.getState() : null;
    }

    getRoomCount() {
        return this.rooms.size;
    }

    // New methods for online mode
    submitWord(roomCode, playerId, word) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        return room.submitWord(playerId, word);
    }

    addChatMessage(roomCode, playerName, text) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        return room.addChatMessage(playerName, text);
    }

    submitVoteOnline(roomCode, voterId, accusedId) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        return room.submitVoteOnline(voterId, accusedId);
    }

    confirmRole(roomCode, playerId) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        return room.confirmRole(playerId);
    }
}

module.exports = GameManager;
