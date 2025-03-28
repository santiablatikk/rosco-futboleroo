const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Archivo JSON para guardar datos de ranking
const dataFile = path.join(__dirname, '../../data/rankingData.json');

// Asegurar que el directorio data existe
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Asegurar que el archivo de datos existe
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([]));
}

// Función para leer datos del archivo
const readRankingData = () => {
  try {
    // Verificar si el archivo existe
    if (!fs.existsSync(dataFile)) {
      console.log('Archivo de ranking no encontrado, creando uno nuevo');
      fs.writeFileSync(dataFile, JSON.stringify([]), 'utf8');
      return [];
    }
    
    // Leer el archivo
    const data = fs.readFileSync(dataFile, 'utf8');
    
    // Intentar parsear el JSON
    try {
      const parsedData = JSON.parse(data);
      if (!Array.isArray(parsedData)) {
        console.error('El archivo de ranking no contiene un array válido');
        return [];
      }
      return parsedData;
    } catch (parseError) {
      console.error('Error al parsear el archivo de ranking:', parseError);
      // Si hay error de parseo, crear un nuevo archivo vacío
      fs.writeFileSync(dataFile, JSON.stringify([]), 'utf8');
      return [];
    }
  } catch (error) {
    console.error('Error al leer archivo de ranking:', error);
    // Crear directorio si no existe
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (mkdirError) {
        console.error('Error al crear directorio de datos:', mkdirError);
      }
    }
    // Intentar crear un nuevo archivo
    try {
      fs.writeFileSync(dataFile, JSON.stringify([]), 'utf8');
    } catch (writeError) {
      console.error('Error al crear archivo de ranking:', writeError);
    }
    return [];
  }
};

// Función para escribir datos en el archivo
const writeRankingData = (data) => {
  try {
    // Asegurar que el directorio exista
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Asegurar que data sea un array
    if (!Array.isArray(data)) {
      console.error('Intentando escribir datos que no son un array');
      data = [];
    }
    
    // Escribir los datos en el archivo
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Datos de ranking guardados: ${data.length} registros`);
    return true;
  } catch (error) {
    console.error('Error al escribir archivo de ranking:', error);
    return false;
  }
};

// Filtrar ranking por período
const filterByPeriod = (data, period) => {
  if (period === 'global') return data;
  
  const now = new Date();
  const startDate = new Date();
  
  if (period === 'monthly') {
    // Primer día del mes actual
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    // Primer día de la semana actual (lunes)
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
  }
  
  return data.filter(item => {
    const gameDate = new Date(item.date);
    return gameDate >= startDate && gameDate <= now;
  });
};

// GET /api/ranking - Obtener datos de ranking
router.get('/', (req, res) => {
  try {
    const period = req.query.period || 'global';
    let rankingData = readRankingData();
    
    // Filtrar por período
    rankingData = filterByPeriod(rankingData, period);
    
    // Ordenar por puntaje (de mayor a menor)
    rankingData.sort((a, b) => b.score - a.score);
    
    res.json(rankingData);
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    res.status(500).json({ error: 'Error al obtener datos de ranking' });
  }
});

// POST /api/ranking - Añadir nueva entrada al ranking
router.post('/', (req, res) => {
  try {
    const { name, score, correct, wrong, difficulty, date, victory } = req.body;
    
    // Validar datos requeridos
    if (!name || score === undefined) {
      return res.status(400).json({ error: 'Faltan datos requeridos (nombre y puntaje)' });
    }
    
    console.log(`Nueva entrada de ranking: ${name}, score: ${score}`);
    
    // Leer datos actuales
    const rankingData = readRankingData();
    
    // Añadir nueva entrada
    const newEntry = {
      name,
      score: Number(score),
      correct: Number(correct || 0),
      wrong: Number(wrong || 0),
      difficulty: difficulty || 'normal',
      date: date || new Date().toISOString(),
      victory: Boolean(victory)
    };
    
    rankingData.push(newEntry);
    
    // Guardar datos actualizados
    if (writeRankingData(rankingData)) {
      // Obtener instancia de Socket.io para emitir evento
      const io = req.app.get('io');
      if (io) {
        // Emitir evento a todos los clientes conectados con los datos completos
        io.emit('rankingUpdate', rankingData);
        console.log(`[DEBUG] Evento rankingUpdate emitido a ${io.engine.clientsCount} clientes con ${rankingData.length} registros`);
      }
      
      res.status(201).json({ 
        success: true, 
        entry: newEntry,
        message: 'Datos guardados y notificados a todos los clientes'
      });
    } else {
      res.status(500).json({ error: 'Error al guardar datos' });
    }
  } catch (error) {
    console.error('Error al añadir entrada al ranking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Mantener la ruta anterior para compatibilidad
router.post('/add', (req, res) => {
  console.log('Redirigiendo petición de /add a /');
  // Simplemente redirigir a la nueva ruta
  router.handle(req, res);
});

module.exports = router; 