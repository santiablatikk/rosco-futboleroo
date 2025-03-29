// server.js
const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = 3002;

// Servir archivos estáticos desde "public" y la raíz para otros archivos
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));
app.use(express.json());

// Helper para leer un JSON
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

// Helper para escribir un JSON
async function writeJSON(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error escribiendo en ${filePath}:`, err);
    throw err;
  }
}

// ENDPOINT DE PREGUNTAS (ya existente)
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

// ENDPOINTS PARA EL RANKING
const rankingFile = path.join(__dirname, "data", "ranking.json");

// GET: Obtener el ranking global
app.get("/ranking", async (req, res) => {
  try {
    const rankingData = await readJSON(rankingFile);
    res.json({ ranking: rankingData });
  } catch (error) {
    console.error("Error al leer ranking:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Registrar un nuevo resultado de juego
app.post("/ranking", async (req, res) => {
  try {
    const newGame = req.body;
    // Validar los datos mínimos del juego
    if (!newGame.name || typeof newGame.score !== "number" || !newGame.date || !newGame.difficulty || typeof newGame.correct !== "number") {
      return res.status(400).json({ error: "Datos de juego inválidos" });
    }
    const rankingData = await readJSON(rankingFile);
    rankingData.push(newGame);
    // Opcional: ordenar el ranking de mayor a menor puntuación
    rankingData.sort((a, b) => b.score - a.score);
    await writeJSON(rankingFile, rankingData);
    res.status(201).json({ message: "Juego registrado correctamente" });
  } catch (error) {
    console.error("Error al guardar juego:", error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
