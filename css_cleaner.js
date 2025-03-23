const fs = require('fs');
const path = require('path');

// Función para limpiar CSS eliminando duplicados
function cleanCSS(cssContent) {
  // Dividir el CSS en reglas
  const blocks = [];
  let currentBlock = '';
  let braceCount = 0;
  let inComment = false;
  let inString = false;
  let escapeChar = false;
  
  // Procesamos carácter por carácter para manejar bloques correctamente
  for (let i = 0; i < cssContent.length; i++) {
    const char = cssContent[i];
    currentBlock += char;
    
    // Manejo de comentarios
    if (char === '/' && cssContent[i + 1] === '*' && !inString) {
      inComment = true;
    } else if (char === '*' && cssContent[i + 1] === '/' && inComment) {
      inComment = false;
      currentBlock += '/';
      i++;
      continue;
    }
    
    // Si estamos en un comentario, continuamos al siguiente carácter
    if (inComment) continue;
    
    // Manejo de strings
    if ((char === '"' || char === "'") && !escapeChar) {
      inString = !inString;
    }
    
    // Manejo de escape characters
    if (char === '\\' && !escapeChar) {
      escapeChar = true;
    } else {
      escapeChar = false;
    }
    
    // Si estamos en un string, continuamos al siguiente carácter
    if (inString) continue;
    
    // Conteo de llaves
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      
      // Si hemos cerrado todas las llaves, es el final de un bloque
      if (braceCount === 0) {
        blocks.push(currentBlock.trim());
        currentBlock = '';
      }
    }
  }
  
  // Mapa para detectar bloques duplicados (por selector)
  const uniqueBlocks = {};
  const keyFrames = [];
  const mediaQueries = [];
  const otherAtRules = [];
  const normalRules = [];
  
  // Clasificar bloques
  blocks.forEach(block => {
    // Ignorar bloques vacíos
    if (!block.trim()) return;
    
    if (block.startsWith('@keyframes') || block.startsWith('@-webkit-keyframes')) {
      keyFrames.push(block);
    } else if (block.startsWith('@media')) {
      mediaQueries.push(block);
    } else if (block.startsWith('@')) {
      otherAtRules.push(block);
    } else {
      // Procesar reglas normales para eliminar duplicados
      const selectorEnd = block.indexOf('{');
      if (selectorEnd !== -1) {
        const selector = block.substring(0, selectorEnd).trim();
        const properties = block.substring(selectorEnd);
        
        // Guardar solo la última declaración de cada selector
        uniqueBlocks[selector] = properties;
      }
    }
  });
  
  // Reconstruir el CSS limpio
  let cleanedCSS = '';
  
  // Agregar reglas normales
  for (const selector in uniqueBlocks) {
    cleanedCSS += selector + uniqueBlocks[selector] + '\n\n';
  }
  
  // Agregar otras reglas @
  otherAtRules.forEach(rule => {
    cleanedCSS += rule + '\n\n';
  });
  
  // Agregar keyframes
  const uniqueKeyframes = {};
  keyFrames.forEach(kf => {
    const nameStart = kf.indexOf('@keyframes ') !== -1 ? 
                      kf.indexOf('@keyframes ') + 11 : 
                      kf.indexOf('@-webkit-keyframes ') + 20;
    const nameEnd = kf.indexOf('{');
    const name = kf.substring(nameStart, nameEnd).trim();
    uniqueKeyframes[name] = kf; // Guarda solo la última definición
  });
  
  for (const name in uniqueKeyframes) {
    cleanedCSS += uniqueKeyframes[name] + '\n\n';
  }
  
  // Procesar media queries para eliminar duplicados
  const uniqueMediaQueries = {};
  mediaQueries.forEach(mq => {
    const mediaEnd = mq.indexOf('{');
    const mediaCondition = mq.substring(0, mediaEnd).trim();
    const mediaContent = mq.substring(mediaEnd + 1, mq.lastIndexOf('}')).trim();
    
    if (!uniqueMediaQueries[mediaCondition]) {
      uniqueMediaQueries[mediaCondition] = [];
    }
    
    // Separar y procesar reglas dentro de la media query
    let mqBlocks = [];
    let mqCurrentBlock = '';
    let mqBraceCount = 0;
    
    for (let i = 0; i < mediaContent.length; i++) {
      const char = mediaContent[i];
      mqCurrentBlock += char;
      
      if (char === '{') {
        mqBraceCount++;
      } else if (char === '}') {
        mqBraceCount--;
        
        if (mqBraceCount === 0) {
          mqBlocks.push(mqCurrentBlock.trim());
          mqCurrentBlock = '';
        }
      }
    }
    
    // Procesar cada bloque dentro de la media query
    mqBlocks.forEach(block => {
      const selectorEnd = block.indexOf('{');
      if (selectorEnd !== -1) {
        const selector = block.substring(0, selectorEnd).trim();
        const properties = block.substring(selectorEnd);
        
        // Solo guardar la última declaración de cada selector
        uniqueMediaQueries[mediaCondition][selector] = properties;
      }
    });
  });
  
  // Reconstruir media queries sin duplicados
  for (const condition in uniqueMediaQueries) {
    cleanedCSS += condition + ' {\n';
    for (const selector in uniqueMediaQueries[condition]) {
      cleanedCSS += '  ' + selector + uniqueMediaQueries[condition][selector].replace(/\n/g, '\n  ') + '\n';
    }
    cleanedCSS += '}\n\n';
  }
  
  return cleanedCSS;
}

// Ruta al archivo CSS original
const cssFilePath = path.join(__dirname, 'public', 'css', 'styles.css');
const outputPath = path.join(__dirname, 'public', 'css', 'styles_optimized.css');

// Leer el archivo CSS
fs.readFile(cssFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error al leer el archivo CSS:', err);
    return;
  }
  
  console.log(`Archivo original: ${(data.length / 1024).toFixed(2)} KB`);
  
  // Limpiar el CSS
  const cleanedCSS = cleanCSS(data);
  
  console.log(`Archivo optimizado: ${(cleanedCSS.length / 1024).toFixed(2)} KB`);
  console.log(`Reducción: ${(100 - (cleanedCSS.length / data.length * 100)).toFixed(2)}%`);
  
  // Guardar el CSS limpio en un nuevo archivo
  fs.writeFile(outputPath, cleanedCSS, 'utf8', (err) => {
    if (err) {
      console.error('Error al guardar el archivo CSS optimizado:', err);
      return;
    }
    
    console.log(`Archivo optimizado guardado en: ${outputPath}`);
  });
});
