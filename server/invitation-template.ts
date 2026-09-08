import type { RecordRow } from "../shared/domain.ts";
import {
  requestCaptureSteps,
  voicePreference,
} from "../shared/request-capture.ts";

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const header = (value: unknown) =>
  String(value ?? "")
    .replace(/[\r\n]/g, " ")
    .slice(0, 200);

/** Both versions contain the same instructions. No remote image or tracking pixel is used. */
export function invitationTemplate({
  company,
  person,
  request,
  url,
}: {
  company: string;
  person: Pick<RecordRow, "title" | "data">;
  request: Pick<RecordRow, "title" | "data">;
  url: string;
}) {
  if (url !== "#" && !/^https?:\/\//.test(url))
    throw new Error("Invalid invitation URL");
  const leadership = request.data.type === "leadership";
  const confirmation = request.data.type === "confirmation";
  const contact = String(request.data.questionPlanVersion || "").startsWith(
    "discovery-contact:",
  );
  const label = contact
    ? "Prepare for our first meeting"
    : leadership
      ? "Your leadership perspective"
      : confirmation
        ? "Review your work descriptions"
        : "Your work, in your words";
  const subject = header(request.data.emailSubject || `${label} · ${company}`);
  const intro = String(
    request.data.emailBody ||
      (contact
        ? `We are preparing for our first meeting with ${company}. Please invite the leaders who should contribute. Bring a list of departments, the people in each department, their email addresses, and their main responsibilities. Correct our public research and confirm the meeting logistics. The executive team can supply detailed goals at kickoff.`
        : leadership
          ? `Your perspective will help us understand ${company}'s goals, customers and responsibilities before we map the work. Please use the questions below to prepare.`
          : confirmation
            ? "Please check the work descriptions assigned to you. Tell us what is correct, what needs to change, or what belongs to someone else."
            : "Help us understand how your work happens. Describe a recent example, what you receive, what you do, and who needs the result. Short, direct answers are useful."),
  );
  const questions = (request.data.questions || []).map(String);
  const due = request.data.dueDate
    ? `Please respond by ${request.data.dueDate}.`
    : "";
  const how = (
    contact
      ? [
          "Open your private kickoff preparation page. Preferably upload a CSV of the full discovery roster: name, email, role, department, manager_email. Include managers to build the reporting chart. If you do not have a CSV, add participants manually with the same details.",
          "Select executive kickoff attendees (sponsor, executives, department heads and relevant board representatives) separately from pilot discovery participants. This does not send invitations to them.",
          "Review the public company profile and proposed operating stages. Tell us what is right, wrong or missing, outline departments and confirm meeting logistics. Answer what you know; leave detailed vision and goals for the executive team. Type or transcribe one response.",
          "Review and send the package. Your advisor checks the roster before it populates the org chart and uses your answers to prepare the two-hour executive kickoff agenda. You can add a voice response.",
        ]
      : [
          "Open your private page.",
          ...(confirmation ? [] : [voicePreference]),
          ...requestCaptureSteps(request.data.type),
        ]
  ).join("\n\n");
  const security =
    "Your private link expires in 7 days. For kickoff preparation, no account or password is needed. Other participant requests may require sign-in. Do not forward this link. Your assigned advisor will review your response.";
  const context = [person.data.role, person.data.team]
    .filter(
      (value) =>
        value && value !== "Not yet provided" && value !== "Engagement contact",
    )
    .join(" · ");
  const text = `Hello ${person.title},\n\n${intro}\n\n${request.title}\n${due}\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n\n")}\n\n${how}\n\nOpen your private page: ${url}\n\n${security}\n\nIf you were not expecting this invitation, contact your advisor before continuing.\n\nDutyGraph · ${company}`;
  const paragraphs = intro.split(/\n\s*\n/).filter(Boolean);
  const bodyHtml = paragraphs
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      if (lines.every((line) => /^\s*[-*•]\s+/.test(line)))
        return `<ul style="padding-left:24px;margin:12px 0 24px">${lines.map((line) => `<li style="margin:10px 0">${escape(line.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
      return `<p style="margin:0 0 22px;white-space:pre-line">${escape(paragraph)}</p>`;
    })
    .join("");
  const action = `<a href="${escape(url)}" style="display:inline-block;padding:16px 24px;background:#242829;border-radius:6px;color:white;font-weight:bold;text-decoration:none">${contact ? "Prepare our executive kickoff" : "Open your private response page"} →</a>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;background:#f1f0ec;color:#242627;font:16px/1.7 Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="800" cellspacing="0" cellpadding="0" style="width:100%;max-width:800px;background:white;border:1px solid #deddd7;border-radius:12px">
<tr><td style="padding:28px 32px;background:#242627;color:white"><strong style="font-size:28px">DutyGraph</strong><div style="font-size:12px;letter-spacing:1px">A Tier 4 Intelligence company</div></td></tr>
<tr><td style="padding:32px"><p style="font-size:12px;letter-spacing:1px;color:#566e74;text-transform:uppercase">${escape(label)} · ${escape(company)}</p><h1 style="font-size:28px;line-height:1.3;margin:12px 0">Hello ${escape(person.title)}.</h1>${context ? `<p style="color:#656c6d">${escape(context)}</p>` : ""}<p><strong>${escape(due)}</strong></p><p style="margin:24px 0">${action}</p>
<h2 style="font-size:21px;margin:32px 0 18px;padding-top:22px;border-top:1px solid #deddd7">${contact ? "Your kickoff brief" : "A note from your advisor"}</h2>${bodyHtml}
<h2 style="font-size:21px;margin:32px 0 14px">Questions to consider</h2><p style="color:#656c6d">You can answer these on your private response page.</p><ol style="padding-left:24px">${questions.map((q: string) => `<li style="margin:0 0 18px;padding-left:6px">${escape(q)}</li>`).join("")}</ol>
<h2 style="font-size:21px;margin:32px 0 18px;padding-top:22px;border-top:1px solid #deddd7">${contact ? "What to prepare" : "How to respond"}</h2>${how
    .split(/\n\s*\n/)
    .map(
      (step, i) =>
        `<div style="padding:16px 20px;margin:12px 0;background:#f6f6f3;border-left:3px solid #94b8a4"><strong>${contact ? ["1. Add your team", "2. Choose attendees", "3. Share leadership context", "4. Review and submit"][i] : `Step ${i + 1}`}</strong><p style="margin:8px 0 0">${escape(step)}</p></div>`,
    )
    .join("")}
<p style="margin:28px 0">${action}</p><h2 style="font-size:17px;margin-top:30px">About your private link</h2><p style="font-size:13px;color:#656b6d">${escape(security)} If you receive a replacement invitation, use the newest email; previous unused links stop working.</p><p style="font-size:13px;color:#656b6d">If you were not expecting this invitation, contact your advisor before continuing.</p></td></tr>
<tr><td style="padding:22px 32px;border-top:1px solid #deddd7;font-size:12px;color:#656b6d">DutyGraph · A Tier 4 Intelligence company.<br><a href="${escape(url)}" style="color:#526b72">Open your private response page</a> if the button above does not work.</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
