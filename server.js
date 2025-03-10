const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Función para leer un archivo JSON y devolver una promesa
function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        return reject(err);
      }
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
  });
}

app.get("/questions", async (req, res) => {
  try {
    // Rutas a los tres archivos JSON
    const file1 = path.join(__dirname, "data", "questions.json");
    const file2 = path.join(__dirname, "data", "questions2.json");
    const file3 = path.join(__dirname, "data", "questions3.json");

    // Leer todos los archivos en paralelo
    const [data1, data2, data3] = await Promise.all([
      readJSON(file1),
      readJSON(file2),
      readJSON(file3)
    ]);

    // Cada archivo debe tener la misma estructura: un array de objetos por letra
    // Por ejemplo: [{ letra: "A", preguntas: [ {pregunta: "...", respuesta: "..."}, ... ] }, ...]
    let combined = {};

    // Función para agregar preguntas de un archivo a "combined"
    function addQuestions(dataArray) {
      dataArray.forEach(item => {
        const letter = item.letra.toUpperCase();
        if (!combined[letter]) {
          combined[letter] = [];
        }
        combined[letter] = combined[letter].concat(item.preguntas);
      });
    }

    // Agregar las preguntas de los tres archivos
    addQuestions(data1);
    addQuestions(data2);
    addQuestions(data3);

    // Para cada letra, seleccionar una pregunta al azar
    let finalArray = [];
    Object.keys(combined)
      .sort()
      .forEach(letter => {
        const questionsArr = combined[letter];
        const randomIndex = Math.floor(Math.random() * questionsArr.length);
        finalArray.push({
          letra: letter,
          pregunta: questionsArr[randomIndex].pregunta,
          respuesta: questionsArr[randomIndex].respuesta
        });
      });

    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: "No se pudieron cargar las preguntas." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
