const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Helpers para leer/escribir JSON
async function readJSON(filePath) {
  const data = await fs.readFile(filePath, "utf8");
  return data.trim() ? JSON.parse(data) : [];
}
async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ----- QUESTIONS ENDPOINT -----
app.get("/questions", async (req, res) => {
  try {
    const lang = req.query.lang === "en" ? "en" : "es";
    // Selecciona los archivos según el idioma
    const files =
      lang === "en"
        ? ["questions_en.json"] // Puedes agregar más archivos para inglés si los tienes
        : ["questions.json", "questions1.json", "questions2.json", "questions3.json"];
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
    for (const letter of Object.keys(combined).sort()) {
      const questionsArr = combined[letter];
      if (questionsArr.length > 0) {
        const randomIndex = Math.floor(Math.random() * questionsArr.length);
        const chosen = questionsArr[randomIndex];
        finalArray.push({
          letra: letter,
          pregunta: chosen.pregunta,
          respuesta: chosen.respuesta
        });
      }
    }

    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error loading questions:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----- RANKING ENDPOINTS -----
const rankingFilePath = path.join(__dirname, "data", "rankingData.json");
app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await readJSON(rankingFilePath);
    res.json(ranking);
  } catch (err) {
    console.error("Error reading ranking:", err);
    res.status(500).json({ error: "Could not read ranking" });
  }
});

app.post("/api/ranking", async (req, res) => {
  try {
    const newRecord = req.body;
    const ranking = await readJSON(rankingFilePath);
    ranking.push(newRecord);
    ranking.sort((a, b) => b.correct - a.correct);
    await writeJSON(rankingFilePath, ranking);
    res.json({ success: true, message: "Ranking updated" });
  } catch (err) {
    console.error("Error updating ranking:", err);
    res.status(500).json({ error: "Could not update ranking" });
  }
});

// ----- PROFILE ENDPOINTS -----
const profileFilePath = path.join(__dirname, "data", "profileData.json");
app.get("/api/profile", async (req, res) => {
  try {
    const profiles = await readJSON(profileFilePath);
    const userIP = req.ip;
    const profile = profiles.find(p => p.ip === userIP) || null;
    res.json(profile);
  } catch (err) {
    console.error("Error reading profile:", err);
    res.status(500).json({ error: "Could not read profile" });
  }
});

app.post("/api/profile", async (req, res) => {
  try {
    const gameStats = req.body;
    const userIP = req.ip;
    let profiles = await readJSON(profileFilePath);

    let profile = profiles.find(p => p.ip === userIP);
    if (!profile) {
      profile = {
        ip: userIP,
        gamesPlayed: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalQuestions: 0,
        totalTime: 0,
        achievements: {},
        history: []
      };
      profiles.push(profile);
    }

    // Actualizar datos acumulados
    profile.gamesPlayed++;
    profile.totalCorrect += gameStats.correct || 0;
    profile.totalWrong += gameStats.wrong || 0;
    profile.totalQuestions += gameStats.total || 0;
    profile.totalTime += gameStats.time || 0;

    // Actualizar logros (se acumulan)
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

    // Guardar historial de partidas
    profile.history.push({
      date: new Date().toLocaleString("en-US"),
      correct: gameStats.correct,
      wrong: gameStats.wrong,
      total: gameStats.total,
      time: gameStats.time
    });

    await writeJSON(profileFilePath, profiles);
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Could not update profile" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
