const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/questions", (req, res) => {
  fs.readFile(path.join(__dirname, "data", "questions.json"), "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer questions.json:", err);
      return res.status(500).json({ error: "No se pudieron cargar las preguntas." });
    }
    res.json(JSON.parse(data));
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
