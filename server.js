// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
// Importación de node-fetch con compatibilidad para ESM y CJS
let fetch;
try {
  // Para Node.js >=18 que tiene fetch nativo
  if (!globalThis.fetch) {
    fetch = require("node-fetch");
  } else {
    fetch = globalThis.fetch;
  }
} catch (error) {
  // Fallback a la versión instalada
  fetch = require("node-fetch");
  console.log("Usando node-fetch importado");
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Servir portal.html como página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "portal.html"));
});

// Socket.io para FutbolMillonario
io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  
  socket.on("playerAnswer", (data) => {
    io.emit("answerResult", data);
  });
  
  socket.on("disconnect", () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// API Routes

// Original PASALA CHE endpoints
app.get("/api/preguntas", (req, res) => {
  try {
    const filePath = path.join(__dirname, "data", "questions.json");
    const rawData = fs.readFileSync(filePath);
    let data = JSON.parse(rawData);
    
    // Filtrar por dificultad si se proporciona
    const dificultad = req.query.dificultad;
    if (dificultad) {
      data = data.filter(item => item.dificultad === dificultad);
    }
    
    res.json({ rosco_futbolero: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// FutbolMillonario endpoints
app.get("/api/questionsLocal", async (req, res) => {
  try {
    const questionsPath = path.join(__dirname, "public", "millonario", "data", "questions.json");
    const data = fs.readFileSync(questionsPath, "utf8");
    if (!data.trim()) {
      throw new Error("El archivo questions.json está vacío");
    }
    const questions = JSON.parse(data);
    console.log("Preguntas local cargadas. Total:", questions.length);
    res.json(questions);
  } catch (error) {
    console.error("Error al cargar questions.json:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/questionsOnline", async (req, res) => {
  try {
    const level = req.query.level; // Ej: '1', '2', ...
    if (!level) {
      return res.status(400).json({ error: "Se requiere parámetro 'level'" });
    }
    const fileName = `level_${level}.json`;
    const questionsPath = path.join(__dirname, "public", "millonario", "data", fileName);
    const data = fs.readFileSync(questionsPath, "utf8");
    const questions = JSON.parse(data);
    console.log(`Preguntas online nivel ${level} cargadas. Total: ${questions.length}`);
    res.json(questions);
  } catch (error) {
    console.error("Error al cargar archivo JSON online:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener datos de ranking
app.get("/api/ranking", (req, res) => {
  try {
    const rankingFile = path.join(__dirname, "data", "ranking.json");
    const rankingData = fs.existsSync(rankingFile) 
      ? JSON.parse(fs.readFileSync(rankingFile)) 
      : [];
    
    res.json({ ranking: rankingData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para guardar partida
app.post("/api/partida", (req, res) => {
  try {
    const gameData = req.body;
    
    if (!gameData || !gameData.player) {
      return res.status(400).json({ error: "Datos de juego inválidos" });
    }
    
    // Aquí se procesaría la lógica para guardar la partida
    console.log("Partida guardada:", gameData);
    
    res.status(201).json({ message: "Juego registrado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
