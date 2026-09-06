document
  .querySelector("#newsletter-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget,
      button = form.querySelector("button"),
      result = document.querySelector("#newsletter-result");
    const fields = Object.fromEntries(new FormData(form));
    button.disabled = true;
    result.textContent = "Saving your interest…";
    try {
      const response = await fetch("/api/newsletter-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, consent: fields.consent === "on" }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message || "Unable to save. Please try again.");
      result.textContent = body.message;
      form.reset();
    } catch (error) {
      result.textContent = error.message || "Unable to save. Please try again.";
    } finally {
      button.disabled = false;
    }
  });
