document.addEventListener("DOMContentLoaded", async () => {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  const volverBtn = document.getElementById("volver");

  try {
    const res = await fetch("/api/ranking");
    const rankingData = await res.json();
    rankingData.sort((a, b) => b.correct - a.correct);

    rankingData.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.name}</td>
        <td>${item.correct}</td>
        <td>${item.wrong}</td>
        <td>${item.date}</td>
        <td>${item.ip}</td>
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
