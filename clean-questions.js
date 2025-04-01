const fs = require('fs');
const path = require('path');

// Función para normalizar el texto (quitar acentos, mayúsculas, signos, espacios extra)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos
    .replace(/[^a-z0-9\s]/g, ' ')    // Solo deja letras, números y espacios
    .replace(/\s+/g, ' ')            // Normaliza espacios múltiples
    .trim();
}

// Función para verificar si dos preguntas son similares
function areSimilar(q1, q2) {
  const normalized1 = normalizeText(q1);
  const normalized2 = normalizeText(q2);
  
  // 1. Verificar si son exactamente iguales después de normalizar
  if (normalized1 === normalized2) {
    return true;
  }
  
  // 2. Verificar si una es substring de la otra (90% o más)
  if (normalized1.includes(normalized2) && normalized2.length / normalized1.length > 0.9) {
    return true;
  }
  if (normalized2.includes(normalized1) && normalized1.length / normalized2.length > 0.9) {
    return true;
  }
  
  // 3. Comparación de palabras en común (Coeficiente de Jaccard)
  const words1 = normalized1.split(' ').filter(w => w.length > 3); // Solo palabras significativas
  const words2 = normalized2.split(' ').filter(w => w.length > 3);
  
  if (words1.length === 0 || words2.length === 0) {
    return false;
  }
  
  const commonWords = words1.filter(w => words2.includes(w));
  const jaccardSimilarity = commonWords.length / (words1.length + words2.length - commonWords.length);
  
  return jaccardSimilarity > 0.7; // Si comparten más del 70% de palabras significativas
}

// Leer el JSON file
const jsonFilePath = path.join(process.cwd(), 'public/millonario/data/questionss.json');
let questions;

try {
  const data = fs.readFileSync(jsonFilePath, 'utf8');
  questions = JSON.parse(data);
  
  // Estadísticas iniciales
  console.log('Archivo leído exitosamente.');
  console.log(`Cantidad inicial: facil: ${questions.facil.length}, media: ${questions.media.length}, dificil: ${questions.dificil.length}`);
  console.log(`Total inicial: ${questions.facil.length + questions.media.length + questions.dificil.length}`);
  
} catch (error) {
  console.error('Error al leer el archivo JSON:', error);
  process.exit(1);
}

// Almacenar las preguntas normalizadas que ya hemos visto
const seenQuestions = new Map();

// Procesar cada categoría por orden de dificultad
const difficultyOrder = ['facil', 'media', 'dificil'];

// Procesar y eliminar duplicados
difficultyOrder.forEach(difficulty => {
  if (!questions[difficulty]) {
    return;
  }
  
  const uniqueQuestions = [];
  
  questions[difficulty].forEach(question => {
    const normalizedText = normalizeText(question.pregunta);
    let isDuplicate = false;
    
    // Verificar si la pregunta ya existe
    for (const [key, value] of seenQuestions.entries()) {
      if (areSimilar(normalizedText, key)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueQuestions.push(question);
      seenQuestions.set(normalizedText, { difficulty, question });
    }
  });
  
  // Actualizar la categoría con preguntas únicas
  questions[difficulty] = uniqueQuestions;
});

// Estadísticas finales
console.log(`Cantidad final: facil: ${questions.facil.length}, media: ${questions.media.length}, dificil: ${questions.dificil.length}`);
console.log(`Total final: ${questions.facil.length + questions.media.length + questions.dificil.length}`);

// Guardar el JSON actualizado
try {
  fs.writeFileSync(jsonFilePath, JSON.stringify(questions, null, 2), 'utf8');
  console.log('Archivo actualizado exitosamente. Preguntas duplicadas o similares eliminadas.');
} catch (error) {
  console.error('Error al escribir el archivo JSON:', error);
  process.exit(1);
} 