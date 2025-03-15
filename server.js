const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const fetch = require("node-fetch"); // Importante para llamar a LibreTranslate

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

// Función para traducir usando LibreTranslate
async function translateText(text, fromLang, toLang) {
  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: fromLang,
        target: toLang,
        format: "text",
        alternatives: 3,
        api_key: "" // Si tienes una API key, ponla aquí
      })
    });
    const data = await response.json();
    if (data && data.translatedText) {
      return data.translatedText;
    } else {
      console.error("No 'translatedText' in LibreTranslate response:", data);
      return text; // Retorna original si algo falla
    }
  } catch (err) {
    console.error("Error en translateText:", err);
    return text; // Retorna original en caso de error
  }
}

// ----- ENDPOINT DE PREGUNTAS -----
app.get("/questions", async (req, res) => {
  try {
    const lang = req.query.lang || "es"; // Capturamos ?lang=en o ?lang=es
    const files = ["questions.json", "questions1.json", "questions2.json", "questions3.json"];
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
    // Recorremos las letras en orden alfabético
    for (const letter of Object.keys(combined).sort()) {
      const questionsArr = combined[letter];
      if (questionsArr.length > 0) {
        const randomIndex = Math.floor(Math.random() * questionsArr.length);
        const chosen = questionsArr[randomIndex];

        // Texto original en español
        let pregunta = chosen.pregunta;
        let respuesta = chosen.respuesta;

        // Si el usuario pidió inglés (lang=en), traducimos
        if (lang === "en") {
          // Ojo: "auto" -> "en" a veces funciona, pero mejor "es" -> "en" si sabes que es español
          pregunta = await translateText(pregunta, "es", "en");
          respuesta = await translateText(respuesta, "es", "en");
        }

        finalArray.push({
          letra: letter,
          pregunta: pregunta,
          respuesta: respuesta
        });
      }
    }

    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----- RANKING Y PERFIL -----
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

app.post("/api/ranking", async (req, res) => {
  try {
    const newRecord = req.body;
    const ranking = await readJSON(rankingFilePath);
    ranking.push(newRecord);
    ranking.sort((a, b) => b.correct - a.correct);
    await writeJSON(rankingFilePath, ranking);
    res.json({ success: true, message: "Ranking actualizado" });
  } catch (err) {
    console.error("Error al actualizar ranking:", err);
    res.status(500).json({ error: "No se pudo actualizar el ranking" });
  }
});

// Perfil
const profileFilePath = path.join(__dirname, "data", "profileData.json");
app.get("/api/profile", async (req, res) => {
  try {
    const profiles = await readJSON(profileFilePath);
    const userIP = req.ip;
    const profile = profiles.find(p => p.ip === userIP) || null;
    res.json(profile);
  } catch (err) {
    console.error("Error al leer perfil:", err);
    res.status(500).json({ error: "No se pudo leer el perfil" });
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

    // Actualizar datos
    profile.gamesPlayed++;
    profile.totalCorrect += gameStats.correct || 0;
    profile.totalWrong += gameStats.wrong || 0;
    profile.totalQuestions += gameStats.total || 0;
    profile.totalTime += gameStats.time || 0;

    // Logros
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

    // Historial
    profile.history.push({
      date: new Date().toLocaleString(),
      correct: gameStats.correct,
      wrong: gameStats.wrong,
      total: gameStats.total,
      time: gameStats.time
    });

    await writeJSON(profileFilePath, profiles);
    res.json({ success: true, message: "Perfil actualizado" });
  } catch (err) {
    console.error("Error al actualizar perfil:", err);
    res.status(500).json({ error: "No se pudo actualizar el perfil" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
