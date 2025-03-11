const express = require("express");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON en peticiones POST
app.use(express.json());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

/**
 * Función para leer y parsear un archivo JSON.
 * Lanza error descriptivo si el archivo está vacío o mal formado.
 * @param {string} filePath - Ruta del archivo.
 */
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    if (!data) throw new Error("Archivo vacío: " + filePath);
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Error leyendo/parsing JSON en ${filePath}: ${error.message}`);
  }
}

// Ruta del archivo para el ranking global
const globalRankingFile = path.join(__dirname, "data", "globalRanking.json");

// Funciones para leer y escribir el ranking global
async function readGlobalRanking() {
  try {
    let ranking;
    try {
      ranking = await fs.readFile(globalRankingFile, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.writeFile(globalRankingFile, JSON.stringify([]));
        ranking = "[]";
      } else {
        throw error;
      }
    }
    return JSON.parse(ranking);
  } catch (error) {
    throw new Error("Error leyendo ranking global: " + error.message);
  }
}

async function writeGlobalRanking(data) {
  try {
    await fs.writeFile(globalRankingFile, JSON.stringify(data, null, 2));
  } catch (error) {
    throw new Error("Error escribiendo ranking global: " + error.message);
  }
}

// Endpoint para obtener preguntas
app.get("/questions", async (req, res) => {
  try {
    // Rutas de los 6 archivos de preguntas
    const files = [
      path.join(__dirname, "data", "questions.json"),
      path.join(__dirname, "data", "questions2.json"),
      path.join(__dirname, "data", "questions3.json"),
      path.join(__dirname, "data", "questions4.json"),
      path.join(__dirname, "data", "questions5.json"),
      path.join(__dirname, "data", "questions6.json")
    ];

    const dataArrays = await Promise.all(files.map(file => readJSON(file)));

    // Agrupar preguntas por letra
    const combined = {};
    dataArrays.forEach((dataArray) => {
      dataArray.forEach(item => {
        const letter = item.letra.toUpperCase();
        if (!combined[letter]) {
          combined[letter] = [];
        }
        combined[letter] = combined[letter].concat(item.preguntas);
      });
    });

    // Seleccionar una pregunta aleatoria por cada letra ordenada
    const finalArray = Object.keys(combined)
      .sort()
      .map(letter => {
        const questionsArr = combined[letter];
        const randomIndex = Math.floor(Math.random() * questionsArr.length);
        return {
          letra: letter,
          pregunta: questionsArr[randomIndex].pregunta,
          respuesta: questionsArr[randomIndex].respuesta
        };
      });

    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener el ranking global
app.get("/ranking", async (req, res) => {
  try {
    const ranking = await readGlobalRanking();
    ranking.sort((a, b) => b.correct - a.correct);
    res.json({ global_ranking: ranking });
  } catch (error) {
    console.error("Error al obtener ranking global:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para actualizar el ranking global (POST)
app.post("/ranking", async (req, res) => {
  try {
    const { name, correct, wrong, date } = req.body;
    if (!name || correct == null || wrong == null || !date) {
      return res.status(400).json({ error: "Datos incompletos para ranking" });
    }
    const ranking = await readGlobalRanking();
    ranking.push({ name, correct, wrong, date });
    await writeGlobalRanking(ranking);
    res.status(201).json({ message: "Ranking actualizado con éxito" });
  } catch (error) {
    console.error("Error actualizando ranking global:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
