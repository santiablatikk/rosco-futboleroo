// js/ranking.js

document.addEventListener("DOMContentLoaded", async () => {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  const volverBtn = document.getElementById("volver");

  if (!rankingTableBody) {
    console.error("No se encontró el elemento '#ranking-table tbody'");
    return;
  }

  try {
    const res = await fetch("/api/ranking");
    if (!res.ok) throw new Error(`Respuesta HTTP no válida: ${res.status}`);
    const rankingData = await res.json();

    if (!Array.isArray(rankingData) || rankingData.length === 0) {
      rankingTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center;">No hay datos en el ranking.</td>
        </tr>`;
    } else {
      rankingData.sort((a, b) => b.correct - a.correct);
      rankingData.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.name || ""}</td>
          <td>${item.correct || 0}</td>
          <td>${item.wrong || 0}</td>
          <td>${item.total || "-"}</td>
          <td>${item.date || "-"}</td>
        `;
        rankingTableBody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error("Error al leer ranking global:", err);
    rankingTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center;">Error al cargar el ranking.</td>
      </tr>`;
  }

  // El script para cambiar el texto del botón "volver" según si ya jugó
  // se encuentra inline en ranking.html, pero si prefieres, podrías
  // haberlo puesto aquí también.
});
