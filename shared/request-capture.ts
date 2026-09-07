export const voicePreference =
  "Voice is preferred: talking through a real example captures the steps, exceptions and frustrations that a short written answer can miss. Typing works too.";
export function requestCaptureSteps(type: string): string[] {
  if (type === "confirmation")
    return [
      "Read each task description and review the exact version shown.",
      "Record your corrections or confirmation, then choose Send my response.",
    ];
  return [
    "Read your personal questions. Choose Start recording, speak through the prompts, then Finish clip and Save recording. You can also upload audio or type your answer.",
    "If you recorded or uploaded audio, choose Create transcript, check the text and use it in your response. Typed answers can go straight to review. Save a draft if you need a break.",
    ...(type === "work"
      ? [
          "Choose Create my task cards. Read each task's inputs, steps, software, result and handoff. Approve it or Edit what needs correcting, then approve it.",
        ]
      : []),
    type === "work"
      ? "Choose Send my response to return your answer and approved cards to the advisor. Approval records your understanding; the team will resolve differences together."
      : "Choose Send my response to return your leadership context to the advisor. This prepares the kickoff; it does not create employee task cards yet.",
  ];
}
