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
  
  // Manejar evento de envío de resultado desde el cliente
  socket.on('client-game-result', (data) => {
    console.log('Resultado de juego recibido desde cliente:', data);
    
    // Reenviar a todos los clientes excepto al remitente
    socket.broadcast.emit('ranking-update', data);
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