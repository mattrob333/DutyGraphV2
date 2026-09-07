import type { ClassificationIntake } from "../../shared/business-classification.ts";
import { api } from "./api.ts";
export type ResearchPlan = {
  version?: 2;
  intake: ClassificationIntake;
  focuses: string[];
  index: number;
  keys: string[];
  runIds: string[];
  classificationKey: string;
  revision: number;
  failed?: boolean;
};
export function readResearchPlan(company: string): ResearchPlan | null {
  try {
    const plan = JSON.parse(
      sessionStorage.getItem(`initial-research:${company}`) || "null",
    );
    return plan &&
      Array.isArray(plan.keys) &&
      Array.isArray(plan.focuses) &&
      Array.isArray(plan.runIds) &&
      typeof plan.intake?.name === "string" &&
      Number.isInteger(plan.index)
      ? plan
      : null;
  } catch {
    return null;
  }
}
export function rememberResearchPlan(
  company: string,
  plan: ResearchPlan | null,
) {
  try {
    if (plan)
      sessionStorage.setItem(
        `initial-research:${company}`,
        JSON.stringify(plan),
      );
    else sessionStorage.removeItem(`initial-research:${company}`);
  } catch {
    /* In-memory plan remains available. */
  }
}
export async function collectInitialResearch(
  company: string,
  initial: ResearchPlan,
  progress: (plan: ResearchPlan) => void,
) {
  let plan = initial;
  while (plan.index < plan.focuses.length) {
    const run = await api(
      `/v1/companies/${company}/research`,
      "POST",
      {
        publicName: plan.intake.name,
        website: plan.intake.website,
        ...(plan.version === 2
          ? { description: plan.intake.description, contextRunIds: plan.runIds }
          : {}),
        focus: plan.focuses[plan.index],
        acknowledgePublicQuery: true,
      },
      plan.keys[plan.index],
    );
    if (run.state !== "complete") {
      if (["failed", "unknown"].includes(run.state))
        progress({ ...plan, failed: true });
      throw new Error(
        run.message ||
          "This search is still running. Resume this pass to check its saved result.",
      );
    }
    plan = { ...plan, index: plan.index + 1, runIds: [...plan.runIds, run.id] };
    progress(plan);
  }
  return plan;
}
