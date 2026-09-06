import { z } from "zod";
const short = z.string().trim().min(1).max(200);
export const agentRequestSchema = z
  .object({
    title: short,
    personId: z.uuid(),
    purpose: z.string().trim().min(10).max(4000),
    taskIds: z.array(z.uuid()).max(20),
    requestedScopes: z
      .array(
        z
          .object({
            system: short,
            resource: short,
            action: short,
          })
          .strict(),
      )
      .max(20),
    humanCheckpoint: z.string().trim().min(3).max(2000),
  })
  .strict();
export const agentRequestStages = [
  ["Request", "Describe the work and the help you need."],
  ["Identity & access", "Check employment, effective access and policy."],
  ["Manifest", "Bind the work, owner and proposed scope to a version."],
  [
    "Notary review",
    "A designated reviewer approves the exact authority request.",
  ],
  [
    "Issue & monitor",
    "Issue through Signet, verify the runtime and track changes.",
  ],
] as const;
export const authorityRequirements = [
  {
    key: "workday",
    title: "Employment and organization",
    source: "Workday / HR source",
    detail: "Current worker, department, manager and employment status.",
  },
  {
    key: "okta",
    title: "Identity and effective access",
    source: "Okta / identity provider",
    detail: "The person's verified identity, accounts and effective access.",
  },
  {
    key: "saviynt",
    title: "Delegation policy",
    source: "Saviynt / policy source",
    detail:
      "Task-specific delegation limits, conflicts and required approvers.",
  },
  {
    key: "notary",
    title: "Authorized notary",
    source: "Company approval policy",
    detail: "A verified reviewer with authority to approve this exact scope.",
  },
  {
    key: "signet",
    title: "Issuance and enforcement",
    source: "Signet / target runtime",
    detail:
      "Managed signing keys, constrained credentials, expiry and revocation.",
  },
] as const;
export function requestLabel(state: string) {
  return (
    (
      {
        demo_reviewed: "Demo · notary reviewed",
        demo_issued: "Demo · issuance simulated",
        requested: "Request received",
        manifest_draft: "Manifest draft",
        reviewed: "Business review complete",
        changes_requested: "Changes requested",
        withdrawn: "Withdrawn",
      } as Record<string, string>
    )[state] || state
  );
}
export function bindingsCurrent(
  bindings: { id: string; version: number; hash: string }[],
  records: { id: string; version: number; hash: string; state?: string }[],
) {
  return bindings.every((b) =>
    records.some(
      (r) =>
        r.id === b.id &&
        r.version === b.version &&
        r.hash === b.hash &&
        !["retracted", "withdrawn", "stale"].includes(r.state || ""),
    ),
  );
}
