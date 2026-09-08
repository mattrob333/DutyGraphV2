/** Coordinator-friendly prompts. One freeform answer, not eight required fields. */
export const kickoffContactPrompts = [
  {
    title: "What should we correct?",
    detail:
      "Review the company snapshot. What is wrong, out of date or missing?",
  },
  {
    title: "What work do customers actually buy?",
    detail:
      "Describe your main products or services and typical customers. Keep different business streams separate.",
  },
  {
    title: "How does a typical job move through the company?",
    detail:
      "Walk through one recent example: request → delivery → payment. Who hands what to whom? Correct the proposed stages where needed.",
  },
  {
    title: "How is the team organized?",
    detail:
      "Name the departments, what each handles and who leads them. Which teams support more than one business stream?",
  },
  {
    title: "Where does work get held up?",
    detail:
      "Share a concrete example of waiting, repeated work, a missing handoff or an approval delay, if you know one.",
  },
  {
    title: "Where is the work tracked?",
    detail:
      "Which main tools, spreadsheets or systems do people use? Where is information copied or hard to find?",
  },
  {
    title: "Who can help us understand the work?",
    detail:
      "Identify the leaders for kickoff and people who know the day-to-day work. Add them to the team list below with reporting managers.",
  },
  {
    title: "What should we know before the meeting?",
    detail:
      "Confirm timing and time zone, priorities or scope limits, and anything we should bring. For unknowns, tell us who can help.",
  },
] as const;
