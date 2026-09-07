import Papa from "papaparse";
export function previewRoster(csv: string, existing: any[] = []) {
  const aliases: Record<string, string> = {
    full_name: "name",
    person: "name",
    reports_to: "manager_email",
    job_title: "role",
    title: "role",
    department: "team",
    dept: "team",
    manager: "manager_email",
  };
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => {
      const n = h.trim().toLowerCase().replace(/\s+/g, "_");
      return aliases[n] || n;
    },
  });
  const errors = parsed.errors.map((e) => e.message);
  for (const key of ["name", "email", "role", "team"])
    if (!parsed.meta.fields?.includes(key))
      errors.push("Missing column: " + key);
  if (parsed.data.length > 500)
    errors.push("The pilot import limit is 500 people.");
  const counts = new Map<string, number>();
  for (const row of parsed.data) {
    const email = (row.email || "").trim().toLowerCase();
    counts.set(email, (counts.get(email) || 0) + 1);
  }
  const rows = parsed.data.slice(0, 500).map((r, index) => {
    const data = {
      name: (r.name || "").trim(),
      email: (r.email || "").trim().toLowerCase(),
      role: (r.role || "").trim(),
      team: (r.team || "").trim(),
      managerEmail: (r.manager_email || "").trim().toLowerCase(),
      externalId: (r.external_id || "").trim(),
    };
    const issues: string[] = [];
    if (!data.name || !data.role || !data.team)
      issues.push("Name, role, and team are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      issues.push("Invalid email.");
    if ((counts.get(data.email) || 0) > 1)
      issues.push("Duplicate email in this file.");
    if (existing.some((p) => p.data.email === data.email))
      issues.push("Email already exists; review the existing person.");
    if (data.managerEmail === data.email)
      issues.push("Self-management is not valid.");
    return { row: index + 2, data, issues };
  });
  const lookup = new Map(rows.map((r) => [r.data.email, r]));
  for (const row of rows) {
    const chain = new Set([row.data.email]);
    let cursor = row.data.managerEmail;
    while (cursor) {
      if (chain.has(cursor)) {
        row.issues.push("Reporting cycle detected.");
        break;
      }
      chain.add(cursor);
      const manager = lookup.get(cursor);
      if (!manager) {
        if (!existing.some((p) => p.data.email === cursor))
          row.issues.push("Manager could not be resolved.");
        break;
      }
      cursor = manager.data.managerEmail;
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rows)
      if (
        !r.issues.length &&
        r.data.managerEmail &&
        lookup.get(r.data.managerEmail)?.issues.length
      ) {
        r.issues.push("Manager row needs correction.");
        changed = true;
      }
  }
  return {
    errors,
    rows,
    validCount: rows.filter((r) => !r.issues.length).length,
  };
}
