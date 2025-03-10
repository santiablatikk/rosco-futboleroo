const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

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

app.get("/questions", async (req, res) => {
  try {
    const file1 = path.join(__dirname, "data", "questions.json");
    const file2 = path.join(__dirname, "data", "questions2.json");
    const file3 = path.join(__dirname, "data", "questions3.json");
    const file4 = path.join(__dirname, "data", "questions4.json");

    const [data1, data2, data3, data4] = await Promise.all([
      readJSON(file1),
      readJSON(file2),
      readJSON(file3),
      readJSON(file4)
    ]);

    // Fusionar todos los archivos en un objeto combinado por letra
    let combined = {};
    function addToCombined(dataArray) {
      dataArray.forEach(item => {
        const letter = item.letra.toUpperCase();
        if (!combined[letter]) {
          combined[letter] = [];
        }
        combined[letter] = combined[letter].concat(item.preguntas);
      });
    }
    addToCombined(data1);
    addToCombined(data2);
    addToCombined(data3);
    addToCombined(data4);

    // Para cada letra, seleccionar una pregunta aleatoria
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
