const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from "public"
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Helper: read JSON
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    throw err;
  }
}

// Helper: write JSON
async function writeJSON(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    throw err;
  }
}

// ----- QUESTIONS ENDPOINT -----
app.get("/questions", async (req, res) => {
  try {
    const files = [
      "questions.json",
      "questions1.json",
      "questions2.json",
      "questions3.json",
    ];
    const filePaths = files.map((f) => path.join(__dirname, "data", f));
    const dataArrays = await Promise.all(filePaths.map(readJSON));

    let combined = {};
    dataArrays.forEach((dataArray) => {
      dataArray.forEach((item) => {
        const letter = item.letra.toUpperCase();
        if (!combined[letter]) {
          combined[letter] = [];
        }
        combined[letter] = combined[letter].concat(item.preguntas);
      });
    });

    let finalArray = [];
    Object.keys(combined)
      .sort()
      .forEach((letter) => {
        const questionsArr = combined[letter];
        if (questionsArr.length > 0) {
          const randomIndex = Math.floor(Math.random() * questionsArr.length);
          // Para traducir las preguntas al inglés, deberías tener otro archivo o lógica aquí.
          finalArray.push({
            letra: letter,
            pregunta: questionsArr[randomIndex].pregunta,
            respuesta: questionsArr[randomIndex].respuesta,
          });
        }
      });

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
    const profile = profiles.find((p) => p.ip === userIP) || null;
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

    let profile = profiles.find((p) => p.ip === userIP);
    if (!profile) {
      profile = {
        ip: userIP,
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

    // Update cumulative data
    profile.gamesPlayed++;
    profile.totalCorrect += gameStats.correct || 0;
    profile.totalWrong += gameStats.wrong || 0;
    profile.totalQuestions += gameStats.total || 0;
    profile.totalTime += gameStats.time || 0;

    // Update achievements (gameStats.achievements is an array of strings)
    if (Array.isArray(gameStats.achievements)) {
      if (!profile.achievements || typeof profile.achievements !== "object") {
        profile.achievements = {};
      }
      gameStats.achievements.forEach((ach) => {
        // Se suman TODOS los logros ganados en la partida
        if (profile.achievements[ach]) {
          profile.achievements[ach] += 1;
        } else {
          profile.achievements[ach] = 1;
        }
      });
    }

    // Save game history
    profile.history.push({
      date: new Date().toLocaleString("en-US"),
      correct: gameStats.correct,
      wrong: gameStats.wrong,
      total: gameStats.total,
      time: gameStats.time,
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
