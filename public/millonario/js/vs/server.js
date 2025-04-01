// Servidor local para VS mode
// Este archivo permite ejecutar un servidor local para pruebas y desarrollo

// Importaciones
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

// Configuración del servidor
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../../../')));

// Datos en memoria
const rooms = new Map();
const questions = require('../../data/questionss.json');

// Generador de códigos de sala
function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Función para obtener preguntas de nivel apropiado
function getQuestionsForGame() {
  const gameQuestions = {};
  
  // Seleccionar preguntas para cada nivel
  for (let level = 1; level <= 6; level++) {
    const levelQuestions = [];
    let sourceData;
    
    // Determinar la fuente de datos según el nivel
    if (level <= 2) {
      sourceData = questions.facil;
    } else if (level <= 4) {
      sourceData = questions.media;
    } else {
      sourceData = questions.dificil;
    }
    
    // Evitar errores si no hay suficientes preguntas
    if (!sourceData || !Array.isArray(sourceData)) {
      continue;
    }
    
    // Mezclar las preguntas disponibles
    const shuffled = [...sourceData].sort(() => 0.5 - Math.random());
    // Tomar 5 preguntas para el nivel
    const selected = shuffled.slice(0, 5);
    
    gameQuestions[`level_${level}`] = selected;
  }
  
  return gameQuestions;
}

// Configuración de Socket.IO
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);
  
  // Obtener salas disponibles
  socket.on('get_available_rooms', () => {
    const availableRooms = [];
    
    rooms.forEach((room, roomId) => {
      // Solo incluir salas que no están en juego y tienen espacio
      if (!room.gameStarted && room.players.length < 2) {
        availableRooms.push({
          id: roomId,
          name: room.name,
          hasPassword: !!room.password,
          playerCount: room.players.length
        });
      }
    });
    
    socket.emit('available_rooms', { rooms: availableRooms });
  });
  
  // Crear sala
  socket.on('create_room', (data) => {
    const { username, roomName, password, forcedRoomId } = data;
    
    // Generar código único
    const roomId = forcedRoomId || generateRoomCode();
    
    // Verificar que el código no exista ya
    if (rooms.has(roomId)) {
      socket.emit('error', { message: 'Ya existe una sala con ese código' });
      return;
    }
    
    // Crear la sala
    const room = {
      id: roomId,
      name: roomName || `Sala de ${username}`,
      password: password || '',
      players: [{
        id: socket.id,
        username,
        isHost: true,
        score: 0
      }],
      gameStarted: false
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    
    // Emitir evento de sala creada
    socket.emit('room_created', {
      roomId,
      roomName: room.name
    });
    
    // Actualizar la lista de salas disponibles para todos
    broadcastAvailableRooms();
  });
  
  // Registrar sala en modo alternativo
  socket.on('register_fallback_room', (data) => {
    const { roomId, roomName, username, players } = data;
    
    // Verificar si ya existe la sala
    if (rooms.has(roomId)) {
      socket.emit('error', { message: 'Ya existe una sala con ese código' });
      return;
    }
    
    // Crear la sala
    const room = {
      id: roomId,
      name: roomName || `Sala de ${username}`,
      password: '',
      players: [{
        id: socket.id,
        username,
        isHost: true,
        score: 0
      }],
      gameStarted: false,
      isFallbackMode: true
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    
    // Emitir evento de sala registrada
    socket.emit('room_created', {
      roomId,
      roomName: room.name
    });
    
    // Actualizar la lista de salas disponibles para todos
    broadcastAvailableRooms();
  });
  
  // Unirse a sala
  socket.on('join_room', (data) => {
    const { username, roomId, password } = data;
    
    // Verificar si existe la sala
    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'No existe una sala con ese código' });
      return;
    }
    
    const room = rooms.get(roomId);
    
    // Verificar si la sala ya está en juego
    if (room.gameStarted) {
      socket.emit('error', { message: 'La partida ya ha comenzado' });
      return;
    }
    
    // Verificar si la sala está llena
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'La sala está llena' });
      return;
    }
    
    // Verificar contraseña
    if (room.password && room.password !== password) {
      socket.emit('error', { message: 'Contraseña incorrecta' });
      return;
    }
    
    // Añadir jugador a la sala
    room.players.push({
      id: socket.id,
      username,
      isHost: false,
      score: 0
    });
    
    socket.join(roomId);
    
    // Emitir evento de unión a sala
    socket.emit('room_joined', {
      roomId,
      players: room.players
    });
    
    // Actualizar jugadores para todos en la sala
    io.to(roomId).emit('players_updated', {
      players: room.players
    });
    
    // Actualizar la lista de salas disponibles para todos
    broadcastAvailableRooms();
  });
  
  // Abandonar sala
  socket.on('leave_room', (data) => {
    const { roomId } = data;
    
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      
      // Encontrar y eliminar el jugador
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        socket.leave(roomId);
        
        // Notificar a los demás jugadores
        io.to(roomId).emit('player_disconnected', {
          username: player.username
        });
        
        // Si quedan jugadores, actualizar información
        if (room.players.length > 0) {
          // Si el anfitrión se va, asignar al siguiente jugador
          if (player.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
          }
          
          io.to(roomId).emit('players_updated', {
            players: room.players
          });
        } else {
          // Si no quedan jugadores, eliminar la sala
          rooms.delete(roomId);
        }
        
        // Actualizar la lista de salas disponibles para todos
        broadcastAvailableRooms();
      }
    }
  });
  
  // Iniciar juego
  socket.on('start_game', (data) => {
    const { roomId } = data;
    
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Verificar que hay dos jugadores
    if (room.players.length !== 2) {
      socket.emit('error', { message: 'Se necesitan 2 jugadores para iniciar' });
      return;
    }
    
    // Verificar que el jugador es el anfitrión
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Solo el anfitrión puede iniciar el juego' });
      return;
    }
    
    // Obtener preguntas para el juego
    const gameQuestions = getQuestionsForGame();
    
    // Seleccionar jugador aleatorio para comenzar
    const firstTurn = room.players[Math.floor(Math.random() * 2)].id;
    
    // Actualizar estado de la sala
    room.gameStarted = true;
    room.questions = gameQuestions;
    room.currentTurn = firstTurn;
    room.currentQuestionIndex = 0;
    
    // Notificar a los jugadores
    io.to(roomId).emit('game_started', {
      questions: gameQuestions,
      firstTurn
    });
    
    // Actualizar la lista de salas disponibles para todos
    broadcastAvailableRooms();
  });
  
  // Responder pregunta
  socket.on('answer_submitted', (data) => {
    const { roomId, isCorrect, points, correctAnswer } = data;
    
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Verificar que es el turno del jugador
    if (room.currentTurn !== socket.id) {
      socket.emit('error', { message: 'No es tu turno' });
      return;
    }
    
    // Actualizar puntuación si la respuesta es correcta
    if (isCorrect) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players[playerIndex].score += points;
      }
    }
    
    // Notificar resultado a todos los jugadores
    io.to(roomId).emit('player_answered', {
      playerId: socket.id,
      isCorrect,
      points: isCorrect ? points : 0,
      correctAnswer,
      players: room.players
    });
  });
  
  // Finalizar turno
  socket.on('end_turn', (data) => {
    const { roomId, questionIndex } = data;
    
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Verificar que es el turno del jugador
    if (room.currentTurn !== socket.id) {
      socket.emit('error', { message: 'No es tu turno' });
      return;
    }
    
    // Actualizar índice de pregunta
    room.currentQuestionIndex = questionIndex;
    
    // Cambiar el turno al otro jugador
    const nextTurn = room.players.find(p => p.id !== socket.id)?.id;
    
    if (nextTurn) {
      room.currentTurn = nextTurn;
      
      // Notificar a los jugadores
      io.to(roomId).emit('next_turn', {
        currentTurn: nextTurn,
        questionIndex
      });
    }
  });
  
  // Solicitud de revancha
  socket.on('request_rematch', (data) => {
    const { roomId } = data;
    
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    
    // Verificar que el jugador es el anfitrión
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Solo el anfitrión puede solicitar revancha' });
      return;
    }
    
    // Reiniciar puntuaciones
    room.players.forEach(p => {
      p.score = 0;
    });
    
    // Obtener nuevas preguntas
    const gameQuestions = getQuestionsForGame();
    
    // Seleccionar jugador aleatorio para comenzar
    const firstTurn = room.players[Math.floor(Math.random() * 2)].id;
    
    // Actualizar estado de la sala
    room.gameStarted = true;
    room.questions = gameQuestions;
    room.currentTurn = firstTurn;
    room.currentQuestionIndex = 0;
    
    // Notificar a los jugadores
    io.to(roomId).emit('game_restarted', {
      questions: gameQuestions,
      firstTurn,
      players: room.players
    });
  });
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    
    // Buscar al jugador en todas las salas
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        // Notificar a los demás jugadores
        io.to(roomId).emit('player_disconnected', {
          username: player.username
        });
        
        // Si quedan jugadores, actualizar información
        if (room.players.length > 0) {
          // Si el anfitrión se va, asignar al siguiente jugador
          if (player.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
          }
          
          io.to(roomId).emit('players_updated', {
            players: room.players
          });
        } else {
          // Si no quedan jugadores, eliminar la sala
          rooms.delete(roomId);
        }
        
        // Actualizar la lista de salas disponibles para todos
        broadcastAvailableRooms();
      }
    });
  });
});

// Función para enviar salas disponibles a todos los clientes
function broadcastAvailableRooms() {
  const availableRooms = [];
  
  rooms.forEach((room, roomId) => {
    // Solo incluir salas que no están en juego y tienen espacio
    if (!room.gameStarted && room.players.length < 2) {
      availableRooms.push({
        id: roomId,
        name: room.name,
        hasPassword: !!room.password,
        playerCount: room.players.length
      });
    }
  });
  
  io.emit('available_rooms', { rooms: availableRooms });
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
}); 