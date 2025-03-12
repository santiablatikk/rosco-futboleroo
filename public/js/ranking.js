document.addEventListener("DOMContentLoaded", () => {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  const volverBtn = document.getElementById("volver");

  // Leer ranking de localStorage
  const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];

  // Ordenar ranking por correctas descendente
  rankingData.sort((a, b) => b.correct - a.correct);

  rankingData.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.correct}</td>
      <td>${item.wrong}</td>
      <td>${item.date}</td>
    `;
    rankingTableBody.appendChild(tr);
  });

  volverBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
