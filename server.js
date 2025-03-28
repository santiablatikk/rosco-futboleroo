const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = 3002;

// Servir archivos estáticos desde la carpeta "public" y la raíz (para ads.txt u otros archivos)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));
app.use(express.json());

/**
 * Helper: Leer un archivo JSON y retornar su contenido.
 * Si el archivo no existe o hay error en el parseo, retorna un array vacío.
 */
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    console.error(`Error leyendo ${filePath}:`, err);
    if (err.code === 'ENOENT' || err instanceof SyntaxError) {
      return [];
    }
    throw err;
  }
}

/**
 * Helper: Escribir datos en un archivo JSON.
 * Si la carpeta no existe, la crea.
 */
async function writeJSON(filePath, data) {
  try {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData);
    console.log(`Datos guardados correctamente en ${filePath}`);
  } catch (err) {
    console.error(`Error escribiendo ${filePath}:`, err);
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

// ==================== ENDPOINTS ====================

// --- Endpoint de preguntas --- //
app.get("/questions", async (req, res) => {
  try {
    const filePath = path.join(__dirname, "data", "questions.json");
    const questionsData = await readJSON(filePath);
    
    let finalArray = [];
    questionsData.forEach((item) => {
      const letter = item.letra.toUpperCase();
      const questions = item.preguntas;
      
      if (questions && questions.length > 0) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        finalArray.push({
          letra: letter,
          pregunta: questions[randomIndex].pregunta,
          respuesta: questions[randomIndex].respuesta,
        });
      }
    });
    
    finalArray.sort((a, b) => a.letra.localeCompare(b.letra));
    
    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- Endpoints de Ranking --- //
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

// --- Endpoints de Perfil --- //
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

// --- Endpoint Unificado para Actualizar Estadísticas de Juego --- //
app.post("/api/update-stats", async (req, res) => {
  try {
    const gameData = req.body;
    const userIP = req.ip;
    const playerName = gameData.player;
    
    if (!playerName) {
      return res.status(400).json({ error: "Nombre de jugador requerido" });
    }
    
    // 1. Actualizar Ranking
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
    
    // Si el jugador ya existe, actualiza solo si el nuevo score es mayor
    const existingEntryIndex = ranking.findIndex(entry => entry.name === playerName);
    if (existingEntryIndex !== -1) {
      if (gameData.score > ranking[existingEntryIndex].score) {
        ranking[existingEntryIndex] = newRankingEntry;
      }
    } else {
      ranking.push(newRankingEntry);
    }
    
    // Ordenar el ranking de mayor a menor puntaje
    ranking.sort((a, b) => b.score - a.score);
    await writeJSON(rankingFilePath, ranking);
    
    // 2. Actualizar Perfil
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
    
    profile.gamesPlayed++;
    profile.totalCorrect += gameData.correctAnswers || 0;
    profile.totalWrong += gameData.errors || 0;
    profile.totalQuestions += (gameData.correctAnswers || 0) + (gameData.errors || 0);
    profile.totalTime += gameData.timeUsed || 0;
    
    // Actualizar nombre si ha cambiado
    if (profile.name !== playerName) {
      profile.name = playerName;
    }
    
    // Registrar logros (si existen)
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
    
    // Agregar partida al historial (limitado a 10 registros)
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
    if (profile.history.length > 10) {
      profile.history = profile.history.slice(0, 10);
    }
    
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

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
