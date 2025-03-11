const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

/**
 * Función para leer y parsear un archivo JSON.
 * Si el contenido está vacío, resuelve con un array vacío.
 * @param {string} filePath - Ruta del archivo.
 * @returns {Promise<Object>}
 */
function readJSON(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) return reject(err);
      if (!data.trim()) {
        console.warn("Archivo vacío: " + filePath);
        return resolve([]); // Resolver con un array vacío
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
    // Definir las rutas de los 6 archivos de preguntas
    const files = [
      path.join(__dirname, "data", "questions.json"),
      path.join(__dirname, "data", "questions2.json"),
      path.join(__dirname, "data", "questions3.json"),
      path.join(__dirname, "data", "questions4.json"),
      path.join(__dirname, "data", "questions5.json"),
      path.join(__dirname, "data", "questions6.json")
    ];

    // Leer todos los archivos en paralelo usando readJSON con manejo de archivo vacío
    const [data1, data2, data3, data4, data5, data6] = await Promise.all(
      files.map(file => readJSON(file))
    );

    // Agrupar preguntas por letra
    let combined = {};
    [data1, data2, data3, data4, data5, data6].forEach((dataArray) => {
      dataArray.forEach(item => {
        const letter = item.letra.toUpperCase();
        if (!combined[letter]) {
          combined[letter] = [];
        }
        combined[letter] = combined[letter].concat(item.preguntas);
      });
    });

    // Para cada letra, seleccionar una pregunta aleatoria
    let finalArray = [];
    Object.keys(combined)
      .sort()
      .forEach(letter => {
        const questionsArr = combined[letter];
        // Solo incluir si hay al menos una pregunta para esa letra
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
