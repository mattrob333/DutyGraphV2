export const FRAMEWORK_GUIDE_VERSION = "2026-09-05.2";
export type FrameworkGuide = {
  group: string;
  question: string;
  cadence: string;
  steps: string[];
  output: string;
};
export const frameworkGroups = [
  {
    id: "business",
    label: "Business model",
    hint: "How the company creates value",
  },
  {
    id: "market",
    label: "Market & external forces",
    hint: "Competition and changes outside the company",
  },
  {
    id: "customer",
    label: "Customer needs",
    hint: "What customers need and choose",
  },
  {
    id: "choices",
    label: "Strategic choices",
    hint: "Where to focus resources",
  },
  {
    id: "execution",
    label: "People, measures & constraints",
    hint: "What to change and how to check the result",
  },
];
export const frameworkGuides: Record<string, FrameworkGuide> = {
  bmc: {
    group: "business",
    question: "How does this business create, deliver and earn value?",
    cadence: "Monthly or when the business model changes",
    steps: [
      "Name customer groups and the problem each group pays to solve.",
      "Map the offer, channels, relationships and revenue for each group.",
      "List the activities, resources, partners and costs needed to deliver.",
      "Check the links between the nine sections. Flag claims without sources.",
    ],
    output:
      "Nine canvas sections, linked sources, open questions and the assumptions to test.",
  },
  industrymap: {
    group: "market",
    question: "Who supplies, competes with and buys from this business?",
    cadence: "Monthly or after a market change",
    steps: [
      "Define the industry, geography and customer segment.",
      "Map suppliers, routes to market, competitors, substitutes and buyers.",
      "Separate direct rivals from firms that solve a different problem.",
      "Record each firm’s offer and source date. Do not infer private performance from marketing claims.",
    ],
    output: "An industry map and a dated competitor list with source links.",
  },
  fiveforces: {
    group: "market",
    question: "Which competitive forces affect profit in this industry?",
    cadence: "Quarterly or after a major competitive change",
    steps: [
      "Use one clearly defined industry and region.",
      "Assess rivalry, new entrants, substitutes, supplier power and buyer power.",
      "For each force, state the evidence, direction and effect on the business.",
      "Separate industry pressure from an internal process problem. Test the strongest alternative explanation.",
    ],
    output:
      "Five force assessments, evidence, uncertainty and implications for the business.",
  },
  pestle: {
    group: "market",
    question: "Which external changes could affect this business?",
    cadence: "Quarterly; sooner after a material event",
    steps: [
      "Review political, economic, social, technological, legal and environmental changes.",
      "Record what changed, where it applies and the source date.",
      "State the possible business effect and time horizon.",
      "Prioritize changes by exposure and evidence. Do not treat a forecast as a fact.",
    ],
    output:
      "A dated external-risk register with exposures and monitoring triggers.",
  },
  swot: {
    group: "choices",
    question:
      "Which strengths and weaknesses matter against current opportunities and threats?",
    cadence: "Monthly or when upstream evidence changes",
    steps: [
      "Separate internal strengths and weaknesses from external opportunities and threats.",
      "Support every item with a current source or prior analysis.",
      "Use TOWS to connect strengths and weaknesses to the external conditions.",
      "Propose a small set of actions and state their trade-offs.",
    ],
    output: "A sourced SWOT and specific TOWS options with tests.",
  },
  vrio: {
    group: "business",
    question: "Which resources give the business an advantage?",
    cadence: "Quarterly or after a capability change",
    steps: [
      "List the resources and capabilities that affect customer value.",
      "Test value, rarity, difficulty to imitate and organizational support separately.",
      "Compare against named competitors only when comparable evidence exists.",
      "Distinguish a claimed capability from demonstrated use.",
    ],
    output:
      "A resource assessment, evidence gaps and capability investments to consider.",
  },
  ansoff: {
    group: "choices",
    question: "Should growth come from existing or new products and markets?",
    cadence: "Quarterly or before a growth decision",
    steps: [
      "Define existing products and markets before classifying options.",
      "Compare market penetration, market development, product development and diversification.",
      "State demand evidence, required capability, cost and major risks for each option.",
      "Choose tests that can reject an option before a large commitment.",
    ],
    output:
      "A growth-option matrix with assumptions, tests and decision owners.",
  },
  threehorizons: {
    group: "choices",
    question: "How should effort be split between today and future growth?",
    cadence: "Quarterly; review commitments monthly",
    steps: [
      "List core-business improvements, emerging opportunities and longer-term options.",
      "State the time horizon and learning goal for each item.",
      "Compare resource demands without inventing investment returns.",
      "Name the evidence needed to continue, change or stop each option.",
    ],
    output:
      "Three investment horizons with learning gates and resource trade-offs.",
  },
  blueocean: {
    group: "choices",
    question: "Can the offer create value in a different way?",
    cadence: "Quarterly or before offer redesign",
    steps: [
      "Choose comparable offers and customer decision factors.",
      "Use evidence to compare the factors; mark missing competitor data.",
      "List what to eliminate, reduce, raise and create.",
      "Test customer demand and cost effects before calling the option an advantage.",
    ],
    output:
      "An evidence-based value comparison and an eliminate/reduce/raise/create proposal.",
  },
  jtbd: {
    group: "customer",
    question: "What progress is the customer trying to make?",
    cadence: "Weekly when new customer interviews arrive",
    steps: [
      "Read customer or prospect transcripts with speaker and time references.",
      "Identify the situation, desired progress, current workaround and buying trigger.",
      "Separate direct quotes from the analyst’s interpretation.",
      "Compare across interviews and record counterexamples. Do not generalize from one call.",
    ],
    output:
      "Job statements, interview evidence, segments and questions to test.",
  },
  vpc: {
    group: "customer",
    question:
      "Does the offer address the customer’s main jobs, pains and gains?",
    cadence: "After new customer evidence; usually monthly",
    steps: [
      "Use the customer segment and jobs established in the business model and interviews.",
      "List jobs, pains and gains with source links.",
      "Map the offer’s features to the pains they relieve and gains they create.",
      "Flag gaps and rank tests by uncertainty, not enthusiasm.",
    ],
    output: "A customer profile and offer map with fit claims and tests.",
  },
  kano: {
    group: "customer",
    question:
      "Which features are essential, improve satisfaction or create delight?",
    cadence: "Per research round or major offer change",
    steps: [
      "Define the customer segment and feature being tested.",
      "Use paired presence/absence questions or state that such research is missing.",
      "Separate basic needs, performance factors, delighters, indifferent and reverse responses.",
      "Report sample size and conflicting responses. Do not label a feature from intuition alone.",
    ],
    output:
      "Feature categories with research coverage, uncertainty and follow-up questions.",
  },
  sevens: {
    group: "execution",
    question: "Do the organization’s parts support the same goal?",
    cadence: "Monthly or after an organization change",
    steps: [
      "Review strategy, structure, systems, shared values, skills, style and staff.",
      "Link each claim to internal evidence or a named account.",
      "Find specific mismatches that affect the flow of work.",
      "Separate reported responsibilities from confirmed authority.",
    ],
    output:
      "An alignment map with observed gaps, owners and questions to resolve.",
  },
  bsc: {
    group: "execution",
    question: "What results matter, and how will we measure progress?",
    cadence: "Review KPIs weekly; set OKRs quarterly",
    steps: [
      "Start with the business goal and current suspected constraint.",
      "Select a small set of financial, customer, process and learning measures.",
      "For each KPI, define the formula, source, owner, population, window and quality checks.",
      "Write an objective and measurable key results with a baseline, target, date and basis. Keep action lists separate from results.",
      "Use competitor benchmarks only when definitions, periods and populations match.",
    ],
    output:
      "A scorecard, linked KPI definitions and proposed objectives with key results.",
  },
  toc: {
    group: "execution",
    question: "What most limits the company’s completed output?",
    cadence: "Weekly or when the limiting condition changes",
    steps: [
      "Define the system boundary, completed output and current demand.",
      "Compare suspected constraints using queues, waits, rework and independent accounts.",
      "Ask whether removing each issue would increase total system output, or move the wait elsewhere.",
      "State the strongest alternative and a measure that distinguishes the explanations.",
      "Propose a small intervention, a prediction and stop conditions. A person must review the diagnosis.",
    ],
    output:
      "A ranked constraint ledger with alternatives, evidence, tests and a proposed intervention.",
  },
  raci: {
    group: "execution",
    question: "Who does, owns, advises on and needs to know about the work?",
    cadence: "When duties or authority change",
    steps: [
      "Start from current task cards and duties.",
      "Name who performs the task and the human accountable for the result.",
      "Record consulted and informed roles separately.",
      "Resolve missing or disputed ownership with the people involved. Do not infer authority from a title or graph edge.",
    ],
    output:
      "A responsibility map and unresolved ownership questions linked to task cards.",
  },
};
export const analysisRules = [
  "Use only selected sources and current upstream analyses. Cite the source and location for each material claim.",
  "Label facts, inferences, assumptions and missing information. Keep contradictory evidence visible.",
  "Never invent a measurement, competitor result, quotation or approval. Record missing values as missing.",
  "Explain the practical effect, the next test and the human who must decide. Save a new version for review when evidence changes.",
];
