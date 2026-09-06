import {
  demoScopes,
  type AuthorityAdapter,
  type AuthorityContext,
  type DemoScenario,
  type SourceSnapshot,
} from "../shared/authority-demo.ts";

// Synthetic, reduced responses. Workday is an XML-to-object projection, not a REST response.
// No adapter in this file has network access or can provision an identity.
export function sampleAuthority(
  person: { id: string; title: string; data: any },
  scenario: DemoScenario = "standard",
  now = new Date(),
): AuthorityContext {
  const email = "tariq.ali@cobalt.example",
    employee = "CB-1042",
    active = scenario !== "inactive";
  const capturedAt = new Date(
    now.getTime() - (scenario === "stale" ? 172800000 : 0),
  ).toISOString();
  const snapshot = (
    id: string,
    vendor: string,
    version: string,
    endpoint: string,
    documentation: string,
    raw: unknown,
    format = "JSON subset",
  ): SourceSnapshot => ({
    id,
    vendor,
    version,
    endpoint,
    documentation,
    raw,
    format,
    capturedAt,
    simulation: true,
  });
  const snapshots = [
    snapshot(
      "workday-worker",
      "Workday",
      "Human Resources v46.2",
      "Get_Workers",
      "https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v46.2/Get_Workers.html",
      {
        Get_Workers_Response: {
          Response_Data: {
            Worker: [
              {
                Worker_Reference: {
                  ID: [{ "@type": "Employee_ID", "#text": employee }],
                },
                Worker_Data: {
                  Worker_ID: employee,
                  Employment_Data: {
                    Worker_Status_Data: { Active: active, Terminated: !active },
                  },
                },
              },
            ],
          },
        },
      },
      "Reduced XML-to-object projection",
    ),
    snapshot(
      "okta-user",
      "Okta",
      "Users v1",
      "GET /api/v1/users/{id}",
      "https://developer.okta.com/docs/api/openapi/okta-management/management/tags/user",
      {
        id: "00uCobaltDemo1042",
        status: active ? "ACTIVE" : "DEPROVISIONED",
        profile: {
          login: email,
          email,
          firstName: "Tariq",
          lastName: "Ali",
          employeeNumber: employee,
          department: "Procurement",
          title: "Procurement analyst",
        },
      },
    ),
    snapshot(
      "entra-user",
      "Microsoft Entra ID",
      "Microsoft Graph v1.0",
      "GET /v1.0/users/{id}?$select=id,displayName,userPrincipalName,employeeId,department,jobTitle,accountEnabled",
      "https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0",
      {
        id: "00000000-0000-4000-8000-000000001042",
        displayName: "Tariq Ali",
        userPrincipalName: email,
        employeeId: employee,
        department: "Procurement",
        jobTitle: "Procurement analyst",
        accountEnabled: active,
      },
    ),
    snapshot(
      "oracle-worker",
      "Oracle HCM",
      "11.13.18.05",
      "GET /hcmRestApi/resources/11.13.18.05/workers",
      "https://docs.oracle.com/en/cloud/saas/human-resources/farws/api-workers-work-relationships-assignments.html",
      {
        items: [{ PersonId: 3001001042, PersonNumber: employee }],
        count: 1,
        hasMore: false,
        limit: 25,
        offset: 0,
      },
    ),
    snapshot(
      "saviynt-user",
      "Saviynt",
      "ECM API v5 · SDK v1.0.0",
      "POST /ECM/api/v5/getUser",
      "https://pkg.go.dev/github.com/saviynt/saviynt-api-go-client/users",
      {
        msg: "Success",
        displaycount: "1",
        totalcount: "1",
        errorCode: "0",
        userdetails: [
          {
            username: email,
            userKey: 1042,
            displayname: "Tariq Ali",
            statuskey: active ? "1" : "0",
          },
        ],
      },
    ),
    snapshot(
      "company-policy",
      "Cobalt policy + access fixture",
      "1",
      "DutyGraph sample policy adapter · not a vendor API",
      "",
      {
        subject: employee,
        effectiveScopes: demoScopes,
        delegableScopes: demoScopes.slice(0, 2),
        taskScopes: demoScopes.slice(0, 2),
        runtimeScopes: demoScopes.slice(0, 2),
        conflict: scenario === "conflict",
        sop: {
          id: "SOP-SUP-004",
          version: 3,
          title: "Prepare a supplier draft",
          instructions:
            "Read the submitted supplier packet. Record missing fields. Prepare a draft. Ask Maya Chen to review before activation. Do not change bank details or release payment.",
          notary: "Priya Shah · sample IAM reviewer",
          maxHours: 8,
        },
      },
      "DutyGraph normalized policy fixture; not a Saviynt API response",
    ),
  ];
  const wd = (snapshots[0].raw as any).Get_Workers_Response.Response_Data
    .Worker[0];
  const ok = snapshots[1].raw as any,
    entra = snapshots[2].raw as any,
    oracle = snapshots[3].raw as any,
    sav = snapshots[4].raw as any,
    policy = snapshots[5].raw as any;
  return {
    mode: "simulation",
    schema: "dutygraph.authority-context.v1",
    subjectId: person.id,
    active:
      wd.Worker_Data.Employment_Data.Worker_Status_Data.Active === true &&
      ok.status === "ACTIVE" &&
      entra.accountEnabled === true,
    identityMatched:
      person.title === "Tariq Ali" &&
      wd.Worker_Data.Worker_ID === ok.profile.employeeNumber &&
      entra.employeeId === oracle.items[0].PersonNumber &&
      sav.userdetails[0].username === ok.profile.login,
    conflict: policy.conflict,
    snapshots,
    employmentSource: "workday-worker",
    identitySource: "okta-user",
    effectiveScopes: policy.effectiveScopes,
    delegableScopes: policy.delegableScopes,
    taskScopes: policy.taskScopes,
    runtimeScopes: policy.runtimeScopes,
    policy: policy.sop,
  };
}
export class DemoAuthorityAdapter implements AuthorityAdapter {
  readonly mode = "simulation" as const;
  constructor(
    private person: { id: string; title: string; data: any },
    private scenario: DemoScenario = "standard",
  ) {}
  async collect(subjectId: string) {
    if (subjectId !== this.person.id) throw new Error("Unmapped identity");
    return sampleAuthority(this.person, this.scenario);
  }
}
