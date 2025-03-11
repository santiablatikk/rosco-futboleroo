document.addEventListener("DOMContentLoaded", () => {
  const rankingTableBody = document.querySelector("#ranking-table tbody");

  fetch("/ranking")
    .then(response => response.json())
    .then(data => {
      const rankingData = data.global_ranking;
      if (Array.isArray(rankingData) && rankingData.length > 0) {
        rankingData.forEach((entry, index) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.correct}</td>
            <td>${entry.wrong}</td>
            <td>${entry.date}</td>
          `;
          rankingTableBody.appendChild(row);
        });
      } else {
        rankingTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;">No hay datos de ranking disponibles.</td>
          </tr>
        `;
      }
    })
    .catch(error => {
      console.error("Error al cargar ranking global:", error);
      rankingTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;">Error cargando ranking.</td>
        </tr>
      `;
    });

  document.getElementById("back-btn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
