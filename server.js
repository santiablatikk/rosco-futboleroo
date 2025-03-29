const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const PORT = 3002;

// Servir archivos estáticos desde "public" y la raíz para ads.txt
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));
app.use(express.json());

// Helper: leer JSON simplificado
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    // Asegurarse de que los datos no estén vacíos y sean JSON válido
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    console.error(`Error leyendo ${filePath}:`, err);
    // Si hay un error de parseo o el archivo no existe, devolver un array vacío
    if (err.code === 'ENOENT' || err instanceof SyntaxError) {
      return [];
    }
    throw err;
  }
}

// ENDPOINT DE PREGUNTAS
app.get("/questions", async (req, res) => {
  try {
    // Simplificado para usar solo questions.json
    const filePath = path.join(__dirname, "data", "questions.json");
    const questionsData = await readJSON(filePath);
    
    let finalArray = [];
    questionsData.forEach((item) => {
      const letter = item.letra.toUpperCase();
      const questions = item.preguntas;
      
      if (questions && questions.length > 0) {
        // Selecciona una pregunta aleatoria para cada letra
        const randomIndex = Math.floor(Math.random() * questions.length);
        finalArray.push({
          letra: letter,
          pregunta: questions[randomIndex].pregunta,
          respuesta: questions[randomIndex].respuesta,
        });
      }
    });
    
    // Ordenar por letra
    finalArray.sort((a, b) => a.letra.localeCompare(b.letra));
    
    res.json({ rosco_futbolero: finalArray });
  } catch (error) {
    console.error("Error al cargar preguntas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
