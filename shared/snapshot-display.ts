/** Short display labels only. Original research remains available as evidence. */
export function snapshotFactText(f: { category: string; label: string; value: string }) {
  const value = f.value.trim();
  if (f.category === "scale") {
    const count = value.match(/(?:employs?|team of|headcount(?: of| is)?|has)\s+(?:about |approximately )?(\d[\d,]*(?:\s*[–-]\s*\d[\d,]*)?)(?:\s+(?:people|employees|staff|team members))?/i)
      || value.match(/(\d[\d,]*(?:\s*[–-]\s*\d[\d,]*)?)\s+(?:people|employees|staff|team members)\b/i);
    if (count) return `${/about|approximately/i.test(count[0]) ? "About " : ""}${count[1]} people`;
  }
  if (f.category === "footprint") {
    const location = value.match(/headquarters (?:are |is )?(?:in |at )([^.;]+)/i);
    if (location) return location[1].trim();
  }
  if (f.category === "offers" || f.category === "competitors") return f.label;
  if (f.category === "customers") {
    const segments = value.match(/(?:homepage |company )?targets? ([^.;]+)/i);
    if (segments) return segments[1].split(/,?\s+while\s+/i)[0].trim();
  }
  // New research uses short values. Never truncate old prose into a false claim.
  return value.length <= 100 ? value : f.label;
}

export function snapshotCompanyLink(f: { label: string; citations?: { url?: string; title?: string }[] }) {
  const name = f.label.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/consulting$|solutions$/g, "");
  if (name.length < 4) return undefined;
  for (const source of f.citations || []) {
    try {
      const url = new URL(source.url || "");
      const host = url.hostname.replace(/^www\./, "");
      if (["https:", "http:"].includes(url.protocol) && host.replace(/[^a-z0-9]/g, "").includes(name)) return url.href;
    } catch { /* A citation without a web address remains in the evidence view. */ }
  }
  return undefined;
}
