// API IDs and capabilities verified against official OpenAI model pages, 2026-09-05.
export const aiModelIds = [
  "gpt-5.6-sol",
  "gpt-6-astra",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-5-mini",
  "gpt-4.1-mini",
] as const;
export const defaultAiModel = "gpt-5.6-sol";
export const reasoningLevels = ["low", "medium", "high"] as const;
export type ReasoningEffort = (typeof reasoningLevels)[number];
export const aiModels = [
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol — recommended",
    description:
      "Flagship reasoning for research synthesis, task cards and hypotheses.",
  },
  {
    id: "gpt-6-astra",
    label: "GPT-6 Astra — most capable",
    description: "Highest capability for difficult analysis; higher cost.",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra — balanced",
    description: "Balances reasoning capability and cost.",
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna — economical",
    description: "Lower-cost option for lighter drafts and high-volume work.",
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 mini — legacy",
    description: "Preserved for existing configurations.",
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini — legacy",
    description: "Legacy non-reasoning model.",
  },
] as const;
export function modelGenerationOptions(
  model: string,
  effort?: ReasoningEffort,
) {
  if (!aiModelIds.some((id) => id === model))
    throw new Error(
      "Unsupported AI model. Choose a supported model in Settings.",
    );
  const modern = model.startsWith("gpt-5.6-") || model === "gpt-6-astra";
  return {
    max_output_tokens: modern ? 12000 : 6000,
    ...(model !== "gpt-4.1-mini"
      ? { reasoning: { effort: effort || (modern ? "medium" : "low") } }
      : {}),
  };
}
