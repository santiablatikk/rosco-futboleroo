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
      // Si el archivo está vacío, resolvemos con un array vacío
      if (!data.trim()) {
        console.error(`Archivo vacío: ${filePath}`);
        return resolve([]);
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error("Error parseando JSON en " + filePath + ": " + error.message));
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
      "questions6.json"  // Si tienes questions6.json, de lo contrario quita esta línea
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

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
