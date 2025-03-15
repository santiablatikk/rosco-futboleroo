document.addEventListener("DOMContentLoaded", async () => {
  const rankingTableBody = document.querySelector("#ranking-table tbody");
  const volverBtn = document.getElementById("volver");

  if (!rankingTableBody) {
    console.error("Element '#ranking-table tbody' not found");
    return;
  }

  try {
    const res = await fetch("/api/ranking");
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const rankingData = await res.json();

    if (!Array.isArray(rankingData) || rankingData.length === 0) {
      rankingTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center;">No ranking data available.</td>
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
    console.error("Error reading global ranking:", err);
    rankingTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center;">Error loading ranking.</td>
      </tr>`;
  }

  if (volverBtn) {
    volverBtn.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  } else {
    console.error("'Back' button not found.");
  }
});
