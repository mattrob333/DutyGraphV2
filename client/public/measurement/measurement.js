(() => {
  "use strict";
  const configNode = document.querySelector("#dutygraph-measurement");
  if (!configNode) return;
  let config;
  try {
    config = JSON.parse(configNode.textContent);
  } catch {
    return;
  }
  const id = config.measurementId;
  if (!/^G-[A-Z0-9]{6,20}$/.test(id || "") || location.origin !== config.origin)
    return;
  if (
    document.querySelector('meta[name="robots"]')?.content.includes("noindex")
  )
    return;
  const key = "dutygraph-analytics-consent-v1";
  const blocked = () =>
    navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";
  let consent = "unset",
    loaded = false,
    viewed = false,
    started = false;
  function savedChoice(value) {
    const saved = JSON.parse(value || "null");
    const age = Date.now() - saved?.at;
    return saved &&
      Number.isFinite(saved.at) &&
      age >= 0 &&
      age < 180 * 86400000 &&
      ["accepted", "declined"].includes(saved.choice)
      ? saved.choice
      : "unset";
  }
  try {
    consent = savedChoice(localStorage.getItem(key));
  } catch {
    /* Storage is optional; consent can work for this page only. */
  }
  const allowed = () => consent === "accepted" && !blocked();
  const commands = (...args) => window.gtag?.(...args);
  const params = () => ({
    page_location: config.origin + config.path,
    page_title: config.title,
    page_referrer: "",
    content_group: config.group,
  });
  function send(name, extra = {}) {
    if (!allowed() || !loaded) return;
    commands("event", name, { ...params(), ...extra, send_to: id });
  }
  function enable() {
    if (!allowed()) return;
    window["ga-disable-" + id] = false;
    if (!loaded) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      commands("consent", "default", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      commands("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      commands("js", new Date());
      commands("config", id, {
        ...params(),
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        ignore_referrer: true,
        cookie_expires: 15552000,
        cookie_update: false,
      });
      const script = document.createElement("script");
      script.id = "dutygraph-google-tag";
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
      document.head.append(script);
      loaded = true;
    } else commands("consent", "update", { analytics_storage: "granted" });
    if (!viewed) {
      send("page_view");
      viewed = true;
    }
  }
  function removeAnalyticsCookies() {
    const names = document.cookie
      .split(";")
      .map((c) => c.split("=")[0].trim())
      .filter((n) => /^_ga(?:_|$)/.test(n));
    for (const name of names)
      for (const domain of ["", location.hostname, "." + location.hostname]) {
        document.cookie =
          name +
          "=; Max-Age=0; Path=/; SameSite=Lax" +
          (domain ? "; Domain=" + domain : "");
      }
  }
  function choose(choice) {
    consent = choice;
    try {
      localStorage.setItem(key, JSON.stringify({ choice, at: Date.now() }));
    } catch {
      /* No persistence required. */
    }
    if (choice === "accepted") enable();
    else {
      window["ga-disable-" + id] = true;
      if (loaded)
        commands("consent", "update", {
          analytics_storage: "denied",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
        });
      removeAnalyticsCookies();
    }
    banner.hidden = true;
    settings.focus({ preventScroll: true });
  }
  const banner = document.createElement("section");
  banner.id = "measurement-choice";
  banner.className = "measurement-choice";
  banner.setAttribute("aria-label", "Optional website analytics");
  banner.innerHTML =
    '<div><strong>Help us improve DutyGraph.</strong><p>With your permission, Google Analytics measures public page visits, downloads and inquiry receipts. We exclude form answers and private workspace pages. <a href="/privacy/">Privacy &amp; measurement</a></p><p id="measurement-status" role="status"></p></div><div class="measurement-actions"><button type="button" data-choice="accepted">Allow analytics</button><button type="button" data-choice="declined">No thanks</button></div>';
  document.body.append(banner);
  const settings = document.createElement("button");
  settings.type = "button";
  settings.textContent = "Analytics choices";
  settings.className = "measurement-settings";
  settings.setAttribute("aria-controls", "measurement-choice");
  (document.querySelector("footer") || document.body).append(settings);
  settings.addEventListener("click", () => {
    banner.hidden = false;
    banner.querySelector('[data-choice="declined"]').focus();
  });
  for (const button of banner.querySelectorAll("[data-choice]"))
    button.addEventListener("click", () => choose(button.dataset.choice));
  if (blocked()) {
    banner.querySelector('[data-choice="accepted"]').disabled = true;
    banner.querySelector("#measurement-status").textContent =
      "Your browser privacy preference is on. Analytics stays off.";
  }
  banner.hidden = consent !== "unset" || blocked();
  enable();

  // Only documented public actions and enumerated values enter the analytics stream.
  // Never transmit input values, arbitrary query values, fragments, link labels or raw referrers.
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest?.("a[href]");
    if (!anchor) return;
    let url;
    try {
      url = new URL(anchor.href, location.href);
    } catch {
      return;
    }
    if (url.origin !== config.origin) return;
    if (config.downloads.includes(url.pathname))
      send("worksheet_download", { file_name: url.pathname });
    if (url.pathname === "/" && url.searchParams.get("demo") === "discovery")
      send("demo_open", { demo_type: "discovery" });
    else if (
      url.pathname === "/" &&
      url.searchParams.get("sample") === "agent-governance"
    )
      send("demo_open", { demo_type: "governance" });
  });
  document.querySelector("#pilot-form")?.addEventListener("focusin", () => {
    if (allowed() && !started) {
      send("pilot_form_start");
      started = true;
    }
  });
  window.addEventListener("dutygraph:pilot-receipt", (event) => {
    const type = event.detail?.inquiryType;
    if (["pilot", "advisor", "enterprise", "team"].includes(type))
      send("pilot_receipt", { inquiry_type: type });
  });
  window.addEventListener("dutygraph:newsletter-receipt", () =>
    send("newsletter_receipt"),
  );
  // Revocation in another tab applies here too.
  window.addEventListener("storage", (event) => {
    if (event.key !== key) return;
    let choice;
    try {
      choice = savedChoice(event.newValue);
    } catch {
      /* Withdraw on corrupt state. */
    }
    consent = choice === "accepted" ? "accepted" : "declined";
    if (allowed()) enable();
    else {
      window["ga-disable-" + id] = true;
      if (loaded)
        commands("consent", "update", { analytics_storage: "denied" });
      removeAnalyticsCookies();
    }
    banner.hidden = true;
  });
})();
