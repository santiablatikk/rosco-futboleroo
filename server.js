const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return reject(err);
      if (!data.trim()) {
        console.error(`Archivo vacío: ${filePath}`);
        return resolve([]);
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error(`Error parseando JSON en ${filePath}: ${error.message}`));
      }
    });
  });
}

app.get("/questions", async (req, res) => {
  try {
    const files = [
      "questions.json",
      "questions2.json",
      "questions3.json",
      "questions4.json",
      "questions5.json",
      "questions6.json",
      "questions7.json"  // Archivo agregado
    ];
    const filePaths = files.map(f => path.join(__dirname, "data", f));
    const dataArrays = await Promise.all(filePaths.map(readJSON));

    let combined = {};
    dataArrays.forEach(dataArray => {
      dataArray.forEach(item => {
        const letter = item.letra.toUpperCase();
        if (!combined[letter]) {
          combined[letter] = [];
        }
        combined[letter] = combined[letter].concat(item.preguntas);
      });
    });

    let finalArray = [];
    Object.keys(combined).sort().forEach(letter => {
      const questionsArr = combined[letter];
      if (questionsArr.length > 0) {
        const randomIndex = Math.floor(Math.random() * questionsArr.length);
        finalArray.push({
          letra: letter,
          pregunta: questionsArr[randomIndex].pregunta,
          respuesta: questionsArr[randomIndex].respuesta
        });
      }
    });

    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: error.message });
  }
});

function readRanking() {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(__dirname, "data", "rankingData.json"), "utf8", (err, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data || "[]"));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function writeRanking(ranking) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(__dirname, "data", "rankingData.json"), JSON.stringify(ranking, null, 2), (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await readRanking();
    res.json(ranking.map(item => ({
      name: item.name,
      correct: item.correct,
      wrong: item.wrong,
      total: item.total,
      date: item.date
    })));
  } catch (err) {
    console.error("Error al leer ranking global:", err);
    res.status(500).json({ error: "No se pudo leer el ranking" });
  }
});

app.post("/api/ranking", async (req, res) => {
  try {
    const newRecord = req.body;
    const ranking = await readRanking();
    ranking.push(newRecord);
    ranking.sort((a, b) => b.correct - a.correct);
    await writeRanking(ranking);
    res.json({ success: true, message: "Ranking actualizado" });
  } catch (err) {
    console.error("Error al escribir ranking global:", err);
    res.status(500).json({ error: "No se pudo actualizar el ranking" });
  }
});

// --- Endpoints para el Perfil ---
function readProfiles() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, "data", "profileData.json");
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data || "[]"));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function writeProfiles(profiles) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, "data", "profileData.json");
    fs.writeFile(filePath, JSON.stringify(profiles, null, 2), (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// GET perfil por IP (la IP se utiliza para identificar, pero no se muestra)
app.get("/api/profile", async (req, res) => {
  try {
    const profiles = await readProfiles();
    const userIP = req.ip;
    const profile = profiles.find(p => p.ip === userIP) || null;
    res.json(profile);
  } catch (err) {
    console.error("Error al leer perfil:", err);
    res.status(500).json({ error: "No se pudo leer el perfil" });
  }
});

// POST actualizar/acumular perfil usando la IP
// Se espera la siguiente estructura en el body:
// { correct, wrong, total, time, achievements: [ "Logro1", "Logro2", ... ] }
app.post("/api/profile", async (req, res) => {
  try {
    const gameStats = req.body;
    const userIP = req.ip;
    let profiles = await readProfiles();
    let profile = profiles.find(p => p.ip === userIP);
    if (!profile) {
      profile = {
        ip: userIP,
        gamesPlayed: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalQuestions: 0,
        totalTime: 0,
        achievements: {}  // almacena logros con recuento: { "Logro X": count, ... }
      };
      profiles.push(profile);
    }
    profile.gamesPlayed++;
    profile.totalCorrect += gameStats.correct || 0;
    profile.totalWrong += gameStats.wrong || 0;
    profile.totalQuestions += gameStats.total || 0;
    profile.totalTime += gameStats.time || 0;
    // Actualizamos logros de forma acumulativa
    if (Array.isArray(gameStats.achievements)) {
      if (!profile.achievements || typeof profile.achievements !== "object") {
        profile.achievements = {};
      }
      gameStats.achievements.forEach(ach => {
        if (profile.achievements[ach]) {
          profile.achievements[ach] += 1;
        } else {
          profile.achievements[ach] = 1;
        }
      });
    }
    await writeProfiles(profiles);
    res.json({ success: true, message: "Perfil actualizado" });
  } catch (err) {
    console.error("Error al actualizar perfil:", err);
    res.status(500).json({ error: "No se pudo actualizar el perfil" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
