const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);
  
  // Emitir evento de conexión exitosa
  socket.emit('connect_success', { 
    message: 'Conexión establecida correctamente',
    timestamp: new Date().toISOString() 
  });
  
  // Cargar datos actuales del ranking para mandar al nuevo cliente
  try {
    const fs = require('fs');
    const path = require('path');
    const dataFile = path.join(__dirname, '../data/rankingData.json');
    
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf8');
      const rankingData = JSON.parse(data);
      
      if (Array.isArray(rankingData)) {
        // Enviar datos actuales solo al cliente recién conectado
        socket.emit('rankingUpdate', rankingData);
        console.log(`Enviados ${rankingData.length} registros de ranking al nuevo cliente: ${socket.id}`);
      }
    }
  } catch (error) {
    console.error('Error al enviar datos iniciales de ranking:', error);
  }
  
  // Manejar evento de envío de resultado desde el cliente
  socket.on('newGameResult', (gameData) => {
    console.log('Nuevo resultado de juego recibido vía Socket.io:', gameData);
    
    try {
      // Validar que los datos sean correctos
      if (!gameData || !gameData.name || gameData.score === undefined) {
        console.error('Datos de juego inválidos recibidos:', gameData);
        return;
      }
      
      // Guardar en el archivo de ranking
      const fs = require('fs');
      const path = require('path');
      const dataFile = path.join(__dirname, '../data/rankingData.json');
      
      // Leer datos actuales
      let rankingData = [];
      try {
        if (fs.existsSync(dataFile)) {
          const data = fs.readFileSync(dataFile, 'utf8');
          rankingData = JSON.parse(data);
          if (!Array.isArray(rankingData)) rankingData = [];
        }
      } catch (readError) {
        console.error('Error al leer archivo de ranking:', readError);
      }
      
      // Añadir nueva entrada
      const newEntry = {
        name: gameData.name,
        score: Number(gameData.score),
        correct: Number(gameData.correct || 0),
        wrong: Number(gameData.wrong || 0),
        difficulty: gameData.difficulty || 'normal',
        date: gameData.date || new Date().toISOString(),
        victory: Boolean(gameData.victory)
      };
      
      rankingData.push(newEntry);
      
      // Guardar datos actualizados
      try {
        fs.writeFileSync(dataFile, JSON.stringify(rankingData, null, 2), 'utf8');
        console.log(`Datos de ranking actualizados vía Socket.io: ${rankingData.length} registros`);
        
        // Reenviar a todos los clientes incluyendo al remitente
        io.emit('rankingUpdate', rankingData);
        console.log(`Evento rankingUpdate emitido a ${io.engine.clientsCount} clientes`);
      } catch (writeError) {
        console.error('Error al escribir archivo de ranking:', writeError);
      }
    } catch (error) {
      console.error('Error al procesar resultado del juego vía Socket.io:', error);
    }
  });
  
  // Manejar evento de ping para verificar la conexión
  socket.on('ping-server', (callback) => {
    console.log('Ping recibido de cliente:', socket.id);
    if (typeof callback === 'function') {
      callback({ 
        success: true, 
        timestamp: new Date().toISOString(),
        clients: io.engine.clientsCount
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Hacer io disponible en las rutas
app.set('io', io);

// Rutas de API para ranking
const rankingRoutes = require('./api/ranking');
app.use('/api/ranking', rankingRoutes);

// Ruta para servir la aplicación
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT} con Socket.io`);
}); 