const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

/**
 * Función para leer y parsear un archivo JSON.
 * @param {string} filePath - Ruta del archivo.
 * @returns {Promise<Object>} - Promesa con el contenido parseado.
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

app.get("/questions", async (req, res) => {
  try {
    // Definir las rutas de los archivos de preguntas
    const files = [
      path.join(__dirname, "data", "questions.json"),
      path.join(__dirname, "data", "questions2.json"),
      path.join(__dirname, "data", "questions3.json"),
      path.join(__dirname, "data", "questions4.json"),
      path.join(__dirname, "data", "questions5.json")
    ];

    // Leer archivos en paralelo
    const [data1, data2, data3, data4, data5] = await Promise.all(
      files.map(file => readJSON(file))
    );

    // Agrupar preguntas por letra
    let combined = {};
    [data1, data2, data3, data4, data5].forEach((dataArray) => {
      dataArray.forEach(item => {
        const letter = item.letra.toUpperCase();
        if (!combined[letter]) {
          combined[letter] = [];
        }
        combined[letter] = combined[letter].concat(item.preguntas);
      });
    });

    // Seleccionar una pregunta aleatoria por cada letra
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
