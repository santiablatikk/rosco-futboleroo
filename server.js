const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = 3002;

// Servir archivos estáticos desde "public" y la raíz para ads.txt
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));
app.use(express.json());

// Helper: leer JSON
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    // Asegurarse de que los datos no estén vacíos y sean JSON válido
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    console.error(`Error leyendo ${filePath}:`, err);
    // Si hay un error de parseo o el archivo no existe, devolver un array vacío
    if (err.code === 'ENOENT' || err instanceof SyntaxError) {
      return [];
    }
    throw err;
  }
}

// Helper: escribir JSON
async function writeJSON(filePath, data) {
  try {
    // Asegurarse de que los datos sean serializables
    const jsonData = JSON.stringify(data, null, 2);
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
app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await readJSON(rankingFilePath);
    res.json(ranking);
  } catch (err) {
    console.error("Error al leer ranking:", err);
    res.status(500).json({ error: "No se pudo leer el ranking" });
  }
});

// ENDPOINTS DE PERFIL
const profileFilePath = path.join(__dirname, "data", "profileData.json");
app.get("/api/profile", async (req, res) => {
  try {
    const profiles = await readJSON(profileFilePath);
    const userIP = req.ip;
    const profile = profiles.find((p) => p.ip === userIP) || null;
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
    
    // 1. Actualizar ranking
    const ranking = await readJSON(rankingFilePath);
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
    const existingEntryIndex = ranking.findIndex(entry => entry.name === playerName);
    if (existingEntryIndex !== -1) {
      // Si el nuevo puntaje es mayor, reemplazar la entrada
      if (gameData.score > ranking[existingEntryIndex].score) {
        ranking[existingEntryIndex] = newRankingEntry;
      }
    } else {
      // Si no existe, agregar nueva entrada
      ranking.push(newRankingEntry);
    }
    
    // Ordenar por puntaje (de mayor a menor)
    ranking.sort((a, b) => b.score - a.score);
    
    // Guardar ranking actualizado
    await writeJSON(rankingFilePath, ranking);
    
    // 2. Actualizar perfil
    let profiles = await readJSON(profileFilePath);
    let profile = profiles.find((p) => p.ip === userIP);
    
    if (!profile) {
      profile = {
        ip: userIP,
        name: playerName,
        gamesPlayed: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalQuestions: 0,
        totalTime: 0,
        achievements: {},
        history: [],
      };
      profiles.push(profile);
    }
    
    // Actualizar estadísticas generales
    profile.gamesPlayed++;
    profile.totalCorrect += gameData.correctAnswers || 0;
    profile.totalWrong += gameData.errors || 0;
    profile.totalQuestions += (gameData.correctAnswers || 0) + (gameData.errors || 0);
    profile.totalTime += gameData.timeUsed || 0;
    
    // Actualizar nombre si ha cambiado
    if (profile.name !== playerName) {
      profile.name = playerName;
    }
    
    // Registrar logros obtenidos
    if (Array.isArray(gameData.achievements)) {
      if (!profile.achievements || typeof profile.achievements !== "object") {
        profile.achievements = {};
      }
      
      gameData.achievements.forEach((achId) => {
        if (profile.achievements[achId]) {
          profile.achievements[achId] += 1;
        } else {
          profile.achievements[achId] = 1;
        }
      });
    }
    
    // Agregar esta partida al historial
    if (!Array.isArray(profile.history)) {
      profile.history = [];
    }
    
    profile.history.unshift({
      date: new Date().toISOString(),
      correct: gameData.correctAnswers || 0,
      wrong: gameData.errors || 0,
      score: gameData.score || 0,
      timeUsed: gameData.timeUsed || 0,
      difficulty: gameData.difficulty || "facil",
      victory: gameData.victory || false,
      achievements: gameData.achievements || []
    });
    
    // Limitar historial a las últimas 10 partidas
    if (profile.history.length > 10) {
      profile.history = profile.history.slice(0, 10);
    }
    
    // Guardar perfiles actualizados
    await writeJSON(profileFilePath, profiles);
    
    res.json({ 
      success: true, 
      message: "Estadísticas actualizadas correctamente",
      ranking_position: ranking.findIndex(entry => entry.name === playerName) + 1
    });
    
  } catch (err) {
    console.error("Error al actualizar estadísticas:", err);
    res.status(500).json({ error: "No se pudo actualizar las estadísticas" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
