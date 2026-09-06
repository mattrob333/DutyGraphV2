(() => {
  const search = document.querySelector("#directory-search"),
    category = document.querySelector("#directory-category");
  const params = new URLSearchParams(location.search);
  search.value = (params.get("q") || "").slice(0, 100);
  if ([...category.options].some((o) => o.value === params.get("category")))
    category.value = params.get("category");
  const update = () => {
    const q = search.value.trim().toLowerCase();
    let count = 0;
    document.querySelectorAll(".directory-card").forEach((card) => {
      card.hidden = !(
        card.dataset.search.includes(q) &&
        (category.value === "All" || category.value === card.dataset.category)
      );
      if (!card.hidden) count++;
    });
    document.querySelector("#directory-count").textContent =
      `${count} organization${count === 1 ? "" : "s"} shown`;
    document.querySelector("#directory-empty").hidden = count > 0;
    const url = new URL(location.href);
    url.search = "";
    if (q) url.searchParams.set("q", q);
    if (category.value !== "All")
      url.searchParams.set("category", category.value);
    history.replaceState(null, "", url);
  };
  search.addEventListener("input", update);
  category.addEventListener("change", update);
  document.querySelector("#directory-reset").addEventListener("click", () => {
    search.value = "";
    category.value = "All";
    update();
    search.focus();
  });
  update();
})();
