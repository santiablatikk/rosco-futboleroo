// public/js/ranking.js
document.addEventListener("DOMContentLoaded", async () => {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  const volverBtn = document.getElementById("volver");

  try {
    const res = await fetch("/api/ranking");
    const rankingData = await res.json();
    // Ordenar por correct descendente
    rankingData.sort((a, b) => b.correct - a.correct);

    rankingData.forEach(item => {
      const tr = document.createElement("tr");
      let achievementsText = "-";
      if (item.achievements && item.achievements.length > 0) {
        achievementsText = item.achievements.map(a =>
          `<span style="display:inline-block;margin:2px;padding:2px 6px;background:#222;border-radius:4px;">
            ${a}
          </span>`
        ).join(" ");
      }
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.correct}</td>
        <td>${item.wrong}</td>
        <td>${item.total || "-"}</td>
        <td>${item.date}</td>
        <td>${achievementsText}</td>
      `;
      rankingTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error al leer ranking global:", err);
  }

  volverBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
