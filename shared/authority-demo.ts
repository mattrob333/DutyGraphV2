import { z } from "zod";

export const scopeSchema = z
  .object({ system: z.string(), resource: z.string(), action: z.string() })
  .strict();
export type Scope = z.infer<typeof scopeSchema>;
export const demoScopes: Scope[] = [
  { system: "Oracle ERP", resource: "Supplier drafts", action: "Create draft" },
  { system: "SharePoint", resource: "Supplier intake", action: "Read" },
  { system: "Oracle ERP", resource: "Supplier bank details", action: "Change" },
];
export const demoScenarios = [
  "standard",
  "inactive",
  "stale",
  "conflict",
] as const;
export type DemoScenario = (typeof demoScenarios)[number];
export interface SourceSnapshot {
  id: string;
  vendor: string;
  version: string;
  endpoint: string;
  documentation: string;
  format: string;
  capturedAt: string;
  simulation: true;
  raw: unknown;
}
export interface AuthorityContext {
  mode: "simulation";
  schema: "dutygraph.authority-context.v1";
  subjectId: string;
  active: boolean;
  identityMatched: boolean;
  conflict: boolean;
  snapshots: SourceSnapshot[];
  employmentSource: string;
  identitySource: string;
  effectiveScopes: Scope[];
  delegableScopes: Scope[];
  taskScopes: Scope[];
  runtimeScopes: Scope[];
  policy: {
    id: string;
    version: number;
    title: string;
    instructions: string;
    notary: string;
    maxHours: number;
  };
}
// Transport adapters return snapshots; mapping and policy remain explicit and independently testable.
export interface AuthorityAdapter {
  readonly mode: "simulation" | "live";
  collect(subjectId: string): Promise<AuthorityContext>;
}
export function evaluateAuthority(
  c: AuthorityContext,
  requested: Scope[],
  now = Date.now(),
) {
  const blockers: string[] = [];
  if (!c.active) blockers.push("Employment or identity is inactive.");
  if (!c.identityMatched)
    blockers.push("The source identifiers do not match the person.");
  if (c.conflict)
    blockers.push(
      "The sample separation-of-duties check found conflicting access.",
    );
  if (
    !c.snapshots.length ||
    c.snapshots.some(
      (s) =>
        !Number.isFinite(Date.parse(s.capturedAt)) ||
        now - Date.parse(s.capturedAt) > 86400000 ||
        Date.parse(s.capturedAt) > now + 60000,
    )
  )
    blockers.push("Source data is missing or more than 24 hours old.");
  const same = (a: Scope, b: Scope) =>
    a.system === b.system && a.resource === b.resource && a.action === b.action;
  const decisions = requested.map((scope) => {
    const missing = [
      ...[
        "Owner access",
        "Delegation policy",
        "Task need",
        "Runtime boundary",
      ].filter(
        (_, i) =>
          ![
            c.effectiveScopes,
            c.delegableScopes,
            c.taskScopes,
            c.runtimeScopes,
          ][i].some((x) => same(x, scope)),
      ),
    ];
    const allowed = !blockers.length && !missing.length;
    return {
      scope,
      allowed,
      reason: allowed
        ? "Within all four sample boundaries."
        : blockers.length
          ? blockers.join(" ")
          : "Outside: " + missing.join(", "),
    };
  });
  return {
    simulation: true,
    blockers,
    decisions,
    eligibleScopes: decisions.filter((d) => d.allowed).map((d) => d.scope),
    grantedScopes: [],
  };
}
