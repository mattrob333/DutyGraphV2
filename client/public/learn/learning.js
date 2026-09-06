document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    let count = 0;
    document.querySelectorAll("[data-category]").forEach((card) => {
      card.hidden = category !== "All" && card.dataset.category !== category;
      if (!card.hidden) count++;
    });
    document.getElementById("vendor-count").textContent =
      `${count} organization${count === 1 ? "" : "s"} shown`;
  });
});
