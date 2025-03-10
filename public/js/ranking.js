document.addEventListener("DOMContentLoaded", () => {
    const rankingTable = document.querySelector("#ranking-table tbody");
    const rankingData = JSON.parse(localStorage.getItem("roscoRanking")) || [];
    
    // Ordenar las entradas por respuestas correctas (de mayor a menor)
    rankingData.sort((a, b) => b.correct - a.correct);
    
    rankingData.forEach((entry, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.name}</td>
        <td>${entry.correct}</td>
        <td>${entry.wrong}</td>
        <td>${entry.date}</td>
      `;
      rankingTable.appendChild(row);
    });
    
    document.getElementById("back-btn").addEventListener("click", () => {
      window.location.href = "index.html";
    });
  });
  