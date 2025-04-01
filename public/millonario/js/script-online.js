// script-online.js

// Función para normalizar cadenas (elimina tildes y convierte a minúsculas)
function normalizar(cadena) {
    return cadena.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  
  // Función de comparación fuzzy: acepta diferencias leves (hasta 1 caracter)
  function compararFuzzy(respuestaUsuario, respuestaCorrecta) {
    const normUser = normalizar(respuestaUsuario.trim());
    const normCorrecta = normalizar(respuestaCorrecta.trim());
    if (normUser === normCorrecta) return true;
    let diff = 0;
    const maxLen = Math.max(normUser.length, normCorrecta.length);
    for (let i = 0; i < maxLen; i++) {
      if (normUser[i] !== normCorrecta[i]) diff++;
    }
    return diff <= 1;
  }
  
  let preguntasCompletas = [];
  let indicePregunta = 0;
  const totalPreguntas = 50;
  
  async function cargarPreguntas() {
    try {
      // En modo online se cargan los 6 archivos JSON por nivel
      const niveles = ["level_1.json", "level_2.json", "level_3.json", "level_4.json", "level_5.json", "level_6.json"];
      for (let archivo of niveles) {
        const resp = await fetch(archivo);
        const data = await resp.json();
        // Cada archivo tiene un arreglo de preguntas; agregamos todas
        preguntasCompletas = preguntasCompletas.concat(data.preguntas || data);
      }
      // Barajar preguntas
      preguntasCompletas = preguntasCompletas.sort(() => Math.random() - 0.5);
      mostrarPregunta(indicePregunta);
    } catch (error) {
      console.error("Error al cargar preguntas:", error);
    }
  }
  
  function mostrarPregunta(indice) {
    if (indice >= totalPreguntas || indice >= preguntasCompletas.length) {
      document.getElementById("game-container").innerHTML = "<h2>¡Juego terminado!</h2>";
      return;
    }
    const preguntaObj = preguntasCompletas[indice];
    const container = document.getElementById("game-container");
    container.innerHTML = "";
    
    const preguntaEl = document.createElement("h2");
    preguntaEl.textContent = preguntaObj.pregunta;
    container.appendChild(preguntaEl);
    
    // Input para respuesta escrita
    const inputRespuesta = document.createElement("input");
    inputRespuesta.type = "text";
    inputRespuesta.placeholder = "Escribe tu respuesta aquí...";
    container.appendChild(inputRespuesta);
    
    const btnEnviar = document.createElement("button");
    btnEnviar.textContent = "Enviar respuesta";
    btnEnviar.addEventListener("click", () => {
      evaluarRespuestaOnline(inputRespuesta.value, preguntaObj, indice);
    });
    container.appendChild(btnEnviar);
  }
  
  function evaluarRespuestaOnline(respuestaUsuario, preguntaObj, indice) {
    const respuestaCorrecta = preguntaObj.opciones[preguntaObj.respuesta_correcta];
    
    if (compararFuzzy(respuestaUsuario, respuestaCorrecta)) {
      mostrarMensaje("¡Correcto!", "correct");
      setTimeout(() => {
        indicePregunta++;
        mostrarPregunta(indicePregunta);
      }, 2000);
    } else {
      if (respuestaUsuario.trim().length < respuestaCorrecta.trim().length / 2) {
        mostrarMensaje("Respuesta Incompleta. Intente nuevamente", "warning");
      } else {
        mostrarMensaje("Incorrecto. La respuesta correcta es: " + respuestaCorrecta, "incorrect");
        setTimeout(() => {
          indicePregunta++;
          mostrarPregunta(indicePregunta);
        }, 3000);
      }
    }
  }
  
  function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById("floating-message");
    mensaje.textContent = texto;
    if (tipo === "correct") {
      mensaje.style.backgroundColor = "#a5d6a7";
    } else if (tipo === "incorrect") {
      mensaje.style.backgroundColor = "#ef9a9a";
    } else if (tipo === "warning") {
      mensaje.style.backgroundColor = "#ffc107";
    }
    mensaje.style.display = "block";
    setTimeout(() => {
      mensaje.style.display = "none";
    }, 2000);
  }
  
  cargarPreguntas();
  