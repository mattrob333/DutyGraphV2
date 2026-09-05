export function linksFor(r: any) {
  const d = r.data,
    links: { target: string; relationship: string; inbound: boolean }[] = [];
  const add = (
    id: string | undefined,
    relationship: string,
    inbound = false,
  ) => {
    if (id) links.push({ target: id, relationship, inbound });
  };
  if (r.kind === "task") {
    add(d.ownerId, "ACCOUNTABLE_FOR", true);
    add(d.performerId, "PERFORMS", true);
    for (const id of d.evidenceIds || []) add(id, "SUPPORTED_BY");
  }
  if (r.kind === "duty" || r.kind === "workflow") {
    add(d.ownerId, "ACCOUNTABLE_FOR", true);
    for (const id of d.taskIds || []) add(id, "CONTAINS");
    for (const id of d.evidenceIds || []) add(id, "SUPPORTED_BY");
  }
  if (r.kind === "person") add(d.managerId, "REPORTS_TO");
  if (r.kind === "candidate")
    for (const id of d.evidenceIds || []) add(id, "SUPPORTED_BY");
  if (r.kind === "agent") {
    add(d.ownerId, "ACCOUNTABLE_FOR", true);
    for (const id of d.taskIds || []) add(id, "BOUND_TO");
  }
  if (r.kind === "intervention") {
    add(d.candidateId, "PROPOSES_CHANGE_TO");
    add(d.metricId, "MEASURED_BY");
    add(d.ownerId, "ACCOUNTABLE_FOR", true);
  }
  return links;
}
