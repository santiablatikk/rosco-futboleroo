const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

/**
 * Lee y parsea un archivo JSON.
 * @param {string} filePath - Ruta completa del archivo.
 * @returns {Promise<Object>} - Promesa que se resuelve con el JSON parseado.
 */
function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Ruta para obtener preguntas aleatorias
app.get("/questions", async (req, res) => {
  try {
    const files = [
      path.join(__dirname, "data", "questions.json"),
      path.join(__dirname, "data", "questions2.json"),
      path.join(__dirname, "data", "questions3.json"),
      path.join(__dirname, "data", "questions4.json"),
      path.join(__dirname, "data", "questions5.json"),
    ];

    const [data1, data2, data3, data4, data5] = await Promise.all(
      files.map(file => readJSON(file))
    );

    const combined = {};
    [data1, data2, data3, data4, data5].forEach(dataArray => {
      dataArray.forEach(question => {
        const letter = question.letra.toUpperCase();
        if (!combined[letter]) combined[letter] = [];
        combined[letter].push(question);
      });
    });

    const finalQuestions = Object.keys(combined).sort().map(letter => {
      const questionsArray = combined[letter];
      const randomIndex = Math.floor(Math.random() * questionsArray.length);
      return questionsArray[randomIndex];
    });

    res.json({ rosco_futbolero: finalQuestions });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: "No se pudieron cargar las preguntas." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
