const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = 3002;

// Servir archivos estáticos desde "public" y la raíz para ads.txt
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));
app.use(express.json());

// Helper: leer JSON con verificación y respaldo
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    // Asegurarse de que los datos no estén vacíos y sean JSON válido
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    console.error(`Error leyendo ${filePath}:`, err);
    
    // Si hay un error de parseo o el archivo no existe, verificar si hay backup
    if (err.code === 'ENOENT' || err instanceof SyntaxError) {
      try {
        // Intentar leer desde el backup si existe
        const backupPath = `${filePath}.backup`;
        const backupData = await fs.readFile(backupPath, "utf8");
        console.log(`Restaurando datos desde backup: ${backupPath}`);
        return backupData.trim() ? JSON.parse(backupData) : [];
      } catch (backupErr) {
        console.log(`No se encontró backup para ${filePath}, retornando array vacío.`);
        return [];
      }
    }
    throw err;
  }
}

// Helper: escribir JSON con backup
async function writeJSON(filePath, data) {
  try {
    // Asegurarse de que los datos sean serializables
    const jsonData = JSON.stringify(data, null, 2);
    
    // Primero crear un backup del archivo actual si existe
    try {
      const currentData = await fs.readFile(filePath, "utf8");
      if (currentData.trim()) {
        const backupPath = `${filePath}.backup`;
        await fs.writeFile(backupPath, currentData);
        console.log(`Backup creado en ${backupPath}`);
      }
    } catch (backupErr) {
      // Si no hay archivo para hacer backup, no pasa nada
      if (backupErr.code !== 'ENOENT') {
        console.warn(`No se pudo crear backup de ${filePath}:`, backupErr);
      }
    }
    
    // Escribir los nuevos datos
    await fs.writeFile(filePath, jsonData);
    console.log(`Datos guardados correctamente en ${filePath}`);
  } catch (err) {
    console.error(`Error escribiendo ${filePath}:`, err);
    // Intentar crear el directorio si no existe
    if (err.code === 'ENOENT') {
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`Archivo creado correctamente en ${filePath}`);
      } catch (createErr) {
        console.error(`Error al crear archivo ${filePath}:`, createErr);
        throw createErr;
      }
    } else {
      throw err;
    }
  }
}

// ENDPOINT DE PREGUNTAS
app.get("/questions", async (req, res) => {
  try {
    // Simplificado para usar solo questions.json
    const filePath = path.join(__dirname, "data", "questions.json");
    const questionsData = await readJSON(filePath);
    
    let finalArray = [];
    questionsData.forEach((item) => {
      const letter = item.letra.toUpperCase();
      const questions = item.preguntas;
      
      if (questions && questions.length > 0) {
        // Selecciona una pregunta aleatoria para cada letra
        const randomIndex = Math.floor(Math.random() * questions.length);
        finalArray.push({
          letra: letter,
          pregunta: questions[randomIndex].pregunta,
          respuesta: questions[randomIndex].respuesta,
        });
      }
    });
    
    // Ordenar por letra
    finalArray.sort((a, b) => a.letra.localeCompare(b.letra));
    
    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: error.message });
  }
});

// ENDPOINTS DE RANKING
const rankingFilePath = path.join(__dirname, "data", "rankingData.json");

// Endpoint para obtener el ranking global
app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await readJSON(rankingFilePath);
    
    // Verificar integridad de datos
    const validatedRanking = ranking.filter(entry => {
      return (
        entry && 
        typeof entry === 'object' && 
        entry.name && 
        typeof entry.name === 'string' && 
        !isNaN(entry.score)
      );
    });
    
    // Asegurarse que el ranking esté ordenado correctamente
    validatedRanking.sort((a, b) => b.score - a.score);
    
    // Añadir posición global para cada jugador
    const rankedData = validatedRanking.map((entry, index) => ({
      ...entry,
      global_rank: index + 1
    }));
    
    res.json(rankedData);
  } catch (err) {
    console.error("Error al leer ranking:", err);
    res.status(500).json({ error: "No se pudo leer el ranking" });
  }
});

// Endpoint adicional con nombre en plural para compatibilidad
app.get("/api/rankings", async (req, res) => {
  try {
    const ranking = await readJSON(rankingFilePath);
    
    // Usar el mismo proceso de validación
    const validatedRanking = ranking.filter(entry => {
      return (
        entry && 
        typeof entry === 'object' && 
        entry.name && 
        typeof entry.name === 'string' && 
        !isNaN(entry.score)
      );
    });
    
    validatedRanking.sort((a, b) => b.score - a.score);
    
    const rankedData = validatedRanking.map((entry, index) => ({
      ...entry,
      global_rank: index + 1
    }));
    
    res.json({ rankings: rankedData });
  } catch (err) {
    console.error("Error al leer rankings:", err);
    res.status(500).json({ error: "No se pudo leer el ranking" });
  }
});

// ENDPOINTS DE PERFIL
const profileFilePath = path.join(__dirname, "data", "profileData.json");

// Endpoint para obtener perfiles
app.get("/api/profile", async (req, res) => {
  try {
    const profiles = await readJSON(profileFilePath);
    
    // Validar datos de perfiles
    const validatedProfiles = profiles.filter(p => 
      p && typeof p === 'object' && p.name && (p.ip || p.user_id)
    );
    
    // Si se solicita todos los perfiles (para la página de ranking global)
    if (req.query.all === 'true') {
      res.json(validatedProfiles);
      return;
    }
    
    // Si se solicita un usuario específico por nombre
    if (req.query.username) {
      const username = req.query.username.toLowerCase();
      const profile = validatedProfiles.find(
        p => p.name && p.name.toLowerCase() === username
      );
      
      res.json(profile || null);
      return;
    }
    
    // Si no, devolver solo el perfil del usuario por IP
    const userIP = req.ip;
    const profile = validatedProfiles.find((p) => p.ip === userIP) || null;
    res.json(profile);
  } catch (err) {
    console.error("Error al leer perfil:", err);
    res.status(500).json({ error: "No se pudo leer el perfil" });
  }
});

// ENDPOINT UNIFICADO PARA ACTUALIZAR ESTADÍSTICAS DE JUEGO
app.post("/api/update-stats", async (req, res) => {
  try {
    const gameData = req.body;
    const userIP = req.ip;
    const playerName = gameData.player;
    
    if (!playerName) {
      return res.status(400).json({ error: "Nombre de jugador requerido" });
    }
    
    console.log(`Actualizando estadísticas para ${playerName} con IP ${userIP}`);
    
    // 1. Actualizar ranking global
    let ranking = await readJSON(rankingFilePath);
    
    // Validar datos existentes
    ranking = ranking.filter(entry => 
      entry && typeof entry === 'object' && entry.name && !isNaN(entry.score)
    );
    
    const newRankingEntry = {
      name: playerName,
      score: gameData.score || 0,
      correct: gameData.correctAnswers || 0,
      wrong: gameData.errors || 0,
      time: gameData.timeUsed || 0,
      difficulty: gameData.difficulty || "facil",
      date: new Date().toISOString(),
    };
    
    // Buscar si ya existe una entrada para este jugador
    const existingEntryIndex = ranking.findIndex(entry => 
      entry.name && entry.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (existingEntryIndex !== -1) {
      // Solo reemplazar si el nuevo puntaje es mayor
      if (gameData.score > ranking[existingEntryIndex].score) {
        console.log(`Actualizando puntaje para ${playerName}: ${ranking[existingEntryIndex].score} -> ${gameData.score}`);
        ranking[existingEntryIndex] = newRankingEntry;
      } else {
        console.log(`Puntaje existente (${ranking[existingEntryIndex].score}) es mayor que el nuevo (${gameData.score}). No se actualiza.`);
      }
    } else {
      // Si no existe, agregar nueva entrada
      console.log(`Agregando nuevo jugador al ranking: ${playerName}`);
      ranking.push(newRankingEntry);
    }
    
    // Ordenar por puntaje (de mayor a menor)
    ranking.sort((a, b) => b.score - a.score);
    
    // Añadir ranking global a cada entrada
    ranking = ranking.map((entry, index) => ({
      ...entry,
      global_rank: index + 1
    }));
    
    // Guardar ranking actualizado
    await writeJSON(rankingFilePath, ranking);
    console.log(`Ranking actualizado y guardado correctamente. Total jugadores: ${ranking.length}`);
    
    // 2. Actualizar perfil de usuario
    let profiles = await readJSON(profileFilePath);
    
    // Validar datos de perfiles
    profiles = profiles.filter(p => 
      p && typeof p === 'object' && p.name && (p.ip || p.user_id)
    );
    
    // Primero buscar por IP
    let profile = profiles.find((p) => p.ip === userIP);
    
    // Si no encuentra por IP, buscar por nombre
    if (!profile) {
      profile = profiles.find((p) => 
        p.name && p.name.toLowerCase() === playerName.toLowerCase()
      );
    }
    
    // Si no hay perfil previo, crear uno nuevo
    if (!profile) {
      console.log(`Creando nuevo perfil para ${playerName} con IP ${userIP}`);
      profile = {
        ip: userIP,
        user_id: `user_${Date.now()}`,
        name: playerName,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        gamesPlayed: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalQuestions: 0,
        totalTime: 0,
        bestScore: 0,
        achievements: {},
        history: [],
      };
      profiles.push(profile);
    } else {
      // Actualizar IP si el perfil no tenía la IP actual
      if (profile.ip !== userIP) {
        profile.ip = userIP;
      }
      
      // Actualizar la fecha de último login
      profile.last_login = new Date().toISOString();
    }
    
    // Actualizar estadísticas generales
    profile.gamesPlayed = (profile.gamesPlayed || 0) + 1;
    profile.totalCorrect = (profile.totalCorrect || 0) + (gameData.correctAnswers || 0);
    profile.totalWrong = (profile.totalWrong || 0) + (gameData.errors || 0);
    profile.totalQuestions = (profile.totalQuestions || 0) + (gameData.correctAnswers || 0) + (gameData.errors || 0);
    profile.totalTime = (profile.totalTime || 0) + (gameData.timeUsed || 0);
    
    // Actualizar mejor puntuación si corresponde
    if ((gameData.score || 0) > (profile.bestScore || 0)) {
      profile.bestScore = gameData.score;
    }
    
    // Actualizar nombre si ha cambiado
    if (profile.name !== playerName) {
      console.log(`Actualizando nombre de perfil: ${profile.name} -> ${playerName}`);
      profile.name = playerName;
    }
    
    // Registrar logros obtenidos
    if (Array.isArray(gameData.achievements)) {
      if (!profile.achievements || typeof profile.achievements !== "object") {
        profile.achievements = {};
      }
      
      gameData.achievements.forEach((achId) => {
        if (profile.achievements[achId]) {
          profile.achievements[achId].count = (profile.achievements[achId].count || 0) + 1;
          profile.achievements[achId].date = new Date().toISOString();
        } else {
          profile.achievements[achId] = {
            count: 1,
            date: new Date().toISOString(),
            category: determineAchievementCategory(achId)
          };
        }
      });
    }
    
    // Agregar esta partida al historial
    if (!Array.isArray(profile.history)) {
      profile.history = [];
    }
    
    // Obtener posición actual en el ranking
    const rankingPosition = ranking.findIndex(entry => 
      entry.name && entry.name.toLowerCase() === playerName.toLowerCase()
    ) + 1;
    
    profile.history.unshift({
      date: new Date().toISOString(),
      correct: gameData.correctAnswers || 0,
      wrong: gameData.errors || 0,
      score: gameData.score || 0,
      timeUsed: gameData.timeUsed || 0,
      difficulty: gameData.difficulty || "facil",
      victory: gameData.victory || false,
      achievements: gameData.achievements || [],
      global_position: rankingPosition
    });
    
    // Limitar historial a las últimas 10 partidas
    if (profile.history.length > 10) {
      profile.history = profile.history.slice(0, 10);
    }
    
    // Añadir información de ranking global
    profile.global_ranking = {
      current_position: rankingPosition,
      best_position: profile.global_ranking?.best_position !== undefined 
        ? Math.min(rankingPosition, profile.global_ranking.best_position) 
        : rankingPosition,
      total_players: ranking.length
    };
    
    // Guardar perfiles actualizados
    await writeJSON(profileFilePath, profiles);
    console.log(`Perfil actualizado para ${playerName}. Total partidas: ${profile.gamesPlayed}`);
    
    res.json({ 
      success: true, 
      message: "Estadísticas actualizadas correctamente",
      ranking_position: rankingPosition,
      total_players: ranking.length,
      profile: {
        name: profile.name,
        gamesPlayed: profile.gamesPlayed,
        bestScore: profile.bestScore
      }
    });
    
  } catch (err) {
    console.error("Error al actualizar estadísticas:", err);
    res.status(500).json({ error: "No se pudo actualizar las estadísticas", details: err.message });
  }
});

// ENDPOINT PARA OBTENER NOMBRE DE USUARIO POR IP
app.get("/api/username", (req, res) => {
  const userIP = req.ip;
  
  readJSON(profileFilePath)
    .then(profiles => {
      const profile = profiles.find(p => p.ip === userIP);
      res.json({
        username: profile ? profile.name : null
      });
    })
    .catch(err => {
      console.error("Error al buscar nombre de usuario:", err);
      res.status(500).json({ error: "No se pudo obtener el nombre de usuario" });
    });
});

// Función auxiliar para determinar la categoría de un logro
function determineAchievementCategory(achievementId) {
  // Mapeo simple de categorías de logros basado en prefijos o nombres
  if (achievementId.startsWith('first_') || achievementId.includes('beginner')) {
    return 'beginner';
  } else if (achievementId.includes('expert') || achievementId.includes('master')) {
    return 'expert';
  } else {
    return 'advanced';
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
