// Socket.io server para modo 1v1

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../../../../')));

// Almacenar información de salas
const rooms = {};

// Generar código de sala aleatorio
function generateRoomId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Cargar preguntas desde archivos JSON
async function loadQuestions() {
  try {
    let allQuestions = {};
    
    // Cargar preguntas de niveles 1 a 6
    for (let level = 1; level <= 6; level++) {
      const filePath = path.join(__dirname, `../../data/level_${level}.json`);
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileData);
      
      // Seleccionar 5 preguntas aleatorias por nivel
      allQuestions[`level_${level}`] = selectRandomQuestions(data.preguntas, 5);
    }
    
    return allQuestions;
  } catch (error) {
    console.error('Error al cargar las preguntas:', error);
    return null;
  }
}

// Seleccionar preguntas aleatorias
function selectRandomQuestions(questions, count) {
  // Hacer una copia del array y mezclarlo
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  // Devolver las primeras 'count' preguntas
  return shuffled.slice(0, count);
}

// Conexión de Socket.io
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  
  // Crear sala
  socket.on('create_room', async (data) => {
    try {
      const { username, roomName, password } = data;
      
      // Generar ID de sala único
      let roomId;
      do {
        roomId = generateRoomId();
      } while (rooms[roomId]);
      
      // Crear la sala
      rooms[roomId] = {
        id: roomId,
        name: roomName || `Sala de ${username}`,
        password: password || '',
        hasPassword: !!password,
        players: [
          {
            id: socket.id,
            username,
            score: 0,
            isHost: true
          }
        ],
        gameStarted: false,
        questions: null,
        currentTurn: null,
        currentQuestionIndex: 0,
        createdAt: new Date()
      };
      
      // Unir al socket a la sala
      socket.join(roomId);
      
      // Enviar confirmación
      socket.emit('room_created', { 
        roomId,
        roomName: rooms[roomId].name
      });
      
      console.log(`Sala creada: ${roomId}, "${rooms[roomId].name}" por: ${username}`);
    } catch (error) {
      console.error('Error al crear sala:', error);
      socket.emit('error', { message: 'Error al crear sala' });
    }
  });
  
  // Unirse a sala
  socket.on('join_room', (data) => {
    try {
      const { username, roomId, password } = data;
      
      // Verificar si la sala existe
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'La sala no existe' });
        return;
      }
      
      // Verificar contraseña si la sala está protegida
      if (rooms[roomId].hasPassword && rooms[roomId].password !== password) {
        socket.emit('error', { message: 'Contraseña incorrecta' });
        return;
      }
      
      // Verificar si el juego ya ha comenzado
      if (rooms[roomId].gameStarted) {
        socket.emit('error', { message: 'El juego ya ha comenzado' });
        return;
      }
      
      // Verificar si la sala está llena
      if (rooms[roomId].players.length >= 2) {
        socket.emit('error', { message: 'La sala está llena' });
        return;
      }
      
      // Agregar jugador a la sala
      rooms[roomId].players.push({
        id: socket.id,
        username,
        score: 0,
        isHost: false
      });
      
      // Unir al socket a la sala
      socket.join(roomId);
      
      // Enviar confirmación y datos de los jugadores
      socket.emit('room_joined', {
        roomId,
        roomName: rooms[roomId].name,
        players: rooms[roomId].players
      });
      
      // Notificar a todos los jugadores de la sala
      io.to(roomId).emit('players_updated', {
        players: rooms[roomId].players
      });
      
      console.log(`Usuario ${username} unido a sala: ${roomId} "${rooms[roomId].name}"`);
    } catch (error) {
      console.error('Error al unirse a sala:', error);
      socket.emit('error', { message: 'Error al unirse a la sala' });
    }
  });
  
  // Salir de la sala
  socket.on('leave_room', (data) => {
    try {
      const { roomId } = data;
      
      // Verificar si la sala existe
      if (!rooms[roomId]) return;
      
      // Obtener el nombre del jugador que sale
      const player = rooms[roomId].players.find(p => p.id === socket.id);
      if (!player) return;
      
      // Eliminar jugador de la sala
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      
      // Abandonar la sala
      socket.leave(roomId);
      
      // Si quedan jugadores, actualizar lista
      if (rooms[roomId].players.length > 0) {
        // Si el host se va, el otro jugador se convierte en host
        if (player.isHost) {
          rooms[roomId].players[0].isHost = true;
        }
        
        // Notificar a los demás jugadores
        io.to(roomId).emit('player_disconnected', { username: player.username });
        io.to(roomId).emit('players_updated', { players: rooms[roomId].players });
      } else {
        // Si no quedan jugadores, eliminar la sala
        delete rooms[roomId];
      }
      
      console.log(`Usuario ${player.username} abandonó sala: ${roomId}`);
    } catch (error) {
      console.error('Error al salir de la sala:', error);
    }
  });
  
  // Iniciar juego
  socket.on('start_game', async (data) => {
    try {
      const { roomId } = data;
      
      // Verificar si la sala existe
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'La sala no existe' });
        return;
      }
      
      // Verificar si el usuario es el host
      const player = rooms[roomId].players.find(p => p.id === socket.id);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Solo el anfitrión puede iniciar el juego' });
        return;
      }
      
      // Verificar que haya 2 jugadores
      if (rooms[roomId].players.length !== 2) {
        socket.emit('error', { message: 'Se necesitan 2 jugadores para iniciar' });
        return;
      }
      
      // Cargar preguntas para el juego
      const questions = await loadQuestions();
      if (!questions) {
        socket.emit('error', { message: 'Error al cargar preguntas' });
        return;
      }
      
      // Configurar juego
      rooms[roomId].gameStarted = true;
      rooms[roomId].questions = questions;
      rooms[roomId].currentQuestionIndex = 0;
      
      // Elegir aleatoriamente quién empieza
      const firstPlayerIndex = Math.floor(Math.random() * 2);
      rooms[roomId].currentTurn = rooms[roomId].players[firstPlayerIndex].id;
      
      // Notificar a todos los jugadores
      io.to(roomId).emit('game_started', {
        questions,
        firstTurn: rooms[roomId].currentTurn
      });
      
      console.log(`Juego iniciado en sala: ${roomId}`);
    } catch (error) {
      console.error('Error al iniciar juego:', error);
      socket.emit('error', { message: 'Error al iniciar el juego' });
    }
  });
  
  // Enviar respuesta
  socket.on('answer_submitted', (data) => {
    try {
      const { roomId, isCorrect, points, correctAnswer } = data;
      
      // Verificar si la sala existe
      if (!rooms[roomId]) return;
      
      // Verificar si es el turno del jugador
      if (rooms[roomId].currentTurn !== socket.id) {
        socket.emit('error', { message: 'No es tu turno' });
        return;
      }
      
      // Actualizar puntuación si la respuesta es correcta
      if (isCorrect) {
        const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          rooms[roomId].players[playerIndex].score += points;
        }
      }
      
      // Notificar a todos los jugadores
      io.to(roomId).emit('player_answered', {
        playerId: socket.id,
        isCorrect,
        points,
        correctAnswer,
        players: rooms[roomId].players
      });
      
      console.log(`Jugador ${socket.id} respondió ${isCorrect ? 'correctamente' : 'incorrectamente'} en sala ${roomId}`);
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      socket.emit('error', { message: 'Error al procesar la respuesta' });
    }
  });
  
  // Finalizar turno
  socket.on('end_turn', (data) => {
    try {
      const { roomId, questionIndex } = data;
      
      // Verificar si la sala existe
      if (!rooms[roomId]) return;
      
      // Actualizar índice de pregunta si se proporciona
      if (questionIndex !== undefined) {
        rooms[roomId].currentQuestionIndex = questionIndex;
      }
      
      // Cambiar al siguiente jugador
      const currentPlayerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
      const nextPlayerIndex = (currentPlayerIndex + 1) % 2;
      rooms[roomId].currentTurn = rooms[roomId].players[nextPlayerIndex].id;
      
      // Notificar a todos los jugadores
      io.to(roomId).emit('next_turn', {
        currentTurn: rooms[roomId].currentTurn,
        questionIndex: rooms[roomId].currentQuestionIndex,
        players: rooms[roomId].players
      });
      
      console.log(`Turno finalizado en sala ${roomId}, siguiente turno: ${rooms[roomId].currentTurn}`);
    } catch (error) {
      console.error('Error al finalizar turno:', error);
      socket.emit('error', { message: 'Error al finalizar el turno' });
    }
  });
  
  // Solicitar revancha
  socket.on('request_rematch', async (data) => {
    try {
      const { roomId } = data;
      
      // Verificar si la sala existe
      if (!rooms[roomId]) return;
      
      // Verificar si el juego ha finalizado
      if (!rooms[roomId].gameStarted) return;
      
      // Reiniciar puntuaciones
      rooms[roomId].players.forEach(player => {
        player.score = 0;
      });
      
      // Cargar nuevas preguntas
      const questions = await loadQuestions();
      if (!questions) {
        socket.emit('error', { message: 'Error al cargar preguntas' });
        return;
      }
      
      // Configurar juego
      rooms[roomId].questions = questions;
      rooms[roomId].currentQuestionIndex = 0;
      
      // Elegir aleatoriamente quién empieza
      const firstPlayerIndex = Math.floor(Math.random() * 2);
      rooms[roomId].currentTurn = rooms[roomId].players[firstPlayerIndex].id;
      
      // Notificar a todos los jugadores
      io.to(roomId).emit('game_restarted', {
        questions,
        firstTurn: rooms[roomId].currentTurn,
        players: rooms[roomId].players
      });
      
      console.log(`Revancha iniciada en sala: ${roomId}`);
    } catch (error) {
      console.error('Error al iniciar revancha:', error);
      socket.emit('error', { message: 'Error al iniciar la revancha' });
    }
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    
    // Buscar y eliminar al jugador de todas las salas
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const disconnectedPlayer = room.players[playerIndex];
        
        // Eliminar jugador de la sala
        room.players.splice(playerIndex, 1);
        
        // Notificar a los demás jugadores
        io.to(roomId).emit('player_disconnected', { username: disconnectedPlayer.username });
        
        // Si quedan jugadores, actualizar lista
        if (room.players.length > 0) {
          // Si el host se va, el otro jugador se convierte en host
          if (disconnectedPlayer.isHost) {
            room.players[0].isHost = true;
          }
          
          io.to(roomId).emit('players_updated', { players: room.players });
        } else {
          // Si no quedan jugadores, eliminar la sala
          delete rooms[roomId];
        }
        
        console.log(`Usuario ${disconnectedPlayer.username} eliminado de sala: ${roomId} (por desconexión)`);
        break;
      }
    }
  });
});

// Redirección principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

server.listen(PORT, () => {
  console.log(`Servidor Socket.io para modo 1vs1 funcionando en puerto ${PORT}`);
});

module.exports = { app, server, io }; 