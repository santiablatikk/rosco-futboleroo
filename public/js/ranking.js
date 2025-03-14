document.addEventListener("DOMContentLoaded", async () => {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  const volverBtn = document.getElementById("volver");

  try {
    const res = await fetch("/api/ranking");
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const rankingData = await res.json();
    rankingData.sort((a, b) => b.correct - a.correct);

    if (rankingData.length === 0) {
      rankingTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center;">No hay datos en el ranking.</td>
        </tr>`;
    } else {
      rankingData.forEach(item => {
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

  if (volverBtn) {
    volverBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }
});
