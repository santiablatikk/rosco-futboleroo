function showResults() {
    const resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const resultStats = document.getElementById('result-stats');
    
    if (resultModal && resultTitle && resultMessage && resultStats) {
      // Configurar el contenido del modal
      resultTitle.textContent = '¡Tiempo terminado!';
      resultMessage.textContent = `Has conseguido ${points} puntos respondiendo ${questionsAnswered} preguntas.`;
      
      // Añadir estadísticas
      resultStats.innerHTML = `
        <p><strong>Dificultad:</strong> ${selectedDifficulty}</p>
        <p><strong>Puntos totales:</strong> ${points}</p>
        <p><strong>Preguntas respondidas:</strong> ${questionsAnswered}</p>
        <p><strong>Promedio de puntos por pregunta:</strong> ${questionsAnswered > 0 ? (points / questionsAnswered).toFixed(2) : 0}</p>
      `;
      
      // Guardar puntuación en localStorage usando la función global
      if (typeof saveScore === 'function') {
        saveScore(savedUsername, points, questionsAnswered, selectedDifficulty);
        
        // Actualizar la vista previa del ranking si existe la función
        if (typeof updateRankingPreview === 'function') {
          updateRankingPreview(points);
        }
      } else {
        console.error('La función saveScore no está disponible');
        // Usar la función local como respaldo
        saveScoreLocal();
      }
      
      // Mostrar el modal
      resultModal.style.display = 'block';
    }
  }
  
  function saveScoreLocal() {
    try {
      // Obtener puntuaciones existentes o crear un array vacío
      const savedScores = JSON.parse(localStorage.getItem('millonarioScores')) || [];
      
      // Crear nuevo registro de puntuación
      const scoreRecord = {
        username: savedUsername,
        points: points,
        questionsAnswered: questionsAnswered,
        difficulty: selectedDifficulty,
        date: new Date().toISOString()
      };
      
      // Añadir nueva puntuación
      savedScores.push(scoreRecord);
      
      // Ordenar por puntuación (de mayor a menor)
      savedScores.sort((a, b) => b.points - a.points);
      
      // Guardar en localStorage
      localStorage.setItem('millonarioScores', JSON.stringify(savedScores));
      
      console.log('Puntuación guardada:', scoreRecord);
    } catch (error) {
      console.error('Error al guardar la puntuación:', error);
    }
  } 