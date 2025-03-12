const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));
// Para parsear JSON en POST
app.use(express.json());

/* ===========================================
   FUNCIONES DE LECTURA/ESCRITURA DE ARCHIVOS
=========================================== */
function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return reject(err);
      if (!data.trim()) {
        // Archivo vacío => array vacío
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

function readRanking() {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(__dirname, "data", "rankingData.json"), "utf8", (err, data) => {
      if (err) return reject(err);
      try {
        const parsed = JSON.parse(data || "[]");
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function writeRanking(ranking) {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(__dirname, "data", "rankingData.json"),
      JSON.stringify(ranking, null, 2),
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

/* ===========================================
   ENDPOINT /questions (FUSIONA ARCHIVOS JSON)
=========================================== */
app.get("/questions", async (req, res) => {
  try {
    // Lista de archivos con preguntas
    const files = [
      "questions.json",
      "questions2.json",
      "questions3.json",
      "questions4.json",
      "questions5.json",
      "questions6.json" // si existe
    ];
    const filePaths = files.map(f => path.join(__dirname, "data", f));

    // Leer todos los archivos en paralelo
    const dataArrays = await Promise.all(filePaths.map(readJSON));

    // Fusionar en un objeto "combined" por letra
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

    // Para cada letra, tomar una pregunta aleatoria
    let finalArray = [];
    Object.keys(combined)
      .sort()
      .forEach(letter => {
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

/* ===========================================
   ENDPOINT /api/ranking (RANKING GLOBAL)
=========================================== */
app.get("/api/ranking", async (req, res) => {
  try {
    const ranking = await readRanking();
    res.json(ranking);
  } catch (err) {
    console.error("Error al leer ranking global:", err);
    res.status(500).json({ error: "No se pudo leer el ranking" });
  }
});

app.post("/api/ranking", async (req, res) => {
  try {
    const newRecord = req.body; // { name, correct, wrong, date }
    const ranking = await readRanking();
    ranking.push(newRecord);

    // Ordenar el ranking por 'correct' descendente
    ranking.sort((a, b) => b.correct - a.correct);

    await writeRanking(ranking);
    res.json({ success: true, message: "Ranking actualizado" });
  } catch (err) {
    console.error("Error al escribir ranking global:", err);
    res.status(500).json({ error: "No se pudo actualizar el ranking" });
  }
});

/* ===========================================
   INICIAR SERVIDOR
=========================================== */
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
