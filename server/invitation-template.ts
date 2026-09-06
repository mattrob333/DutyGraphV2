import type { RecordRow } from "../shared/domain.ts";

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
        ? `We are preparing for our first meeting with ${company}. Please invite the leaders who should contribute. Bring a list of departments, the people in each department, their email addresses, and their main responsibilities. Share your goals for the next month, six months and year, along with the problems you want to address.`
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
  const how = confirmation
    ? "Open your private page, review each work description, and send your corrections."
    : "Open your private page. Voice is preferred: a real example helps us capture the steps, exceptions, and frustrations. You can type instead. Save a draft if you need a break. For a work interview, create your task cards, check or edit them, then send everything together.";
  const security =
    "Your private link expires in 7 days. On your first visit, create a password to protect your responses. If you already have an account, sign in. Do not forward this link. Your assigned advisor will review your response.";
  const context = [person.data.role, person.data.team]
    .filter(Boolean)
    .join(" · ");
  const text = `Hello ${person.title},\n\n${intro}\n\n${request.title}\n${due}\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n\n")}\n\n${how}\n\nOpen your private page: ${url}\n\n${security}\n\nIf you were not expecting this invitation, contact your advisor before continuing.\n\nDutyGraph · ${company}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:#f1f0ec;color:#242627;font-family:Arial,Helvetica,sans-serif;line-height:1.6"><div style="display:none;max-height:0;overflow:hidden">${escape(label)} — ${escape(company)}. ${escape(due)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:36px 16px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #deddd7;border-radius:12px"><tr><td style="padding:28px 32px;border-bottom:1px solid #e7e6e1;background:#242627;color:#f4f2eb;border-radius:12px 12px 0 0"><strong style="font-size:25px;letter-spacing:-1px">DutyGraph</strong><div style="font-size:11px;letter-spacing:2px;color:#c0c4c1;text-transform:uppercase">${escape(company)}</div></td></tr><tr><td style="padding:32px"><div style="font-size:11px;font-weight:bold;letter-spacing:1.4px;color:#566e74;text-transform:uppercase">${escape(label)}</div><h1 style="font-size:26px;line-height:1.25;letter-spacing:-.6px;margin:12px 0 20px">Hello ${escape(person.title)}.</h1>${context ? `<p style="font-size:13px;color:#656c6d;margin-top:-10px">${escape(context)}</p>` : ""}${intro
    .split(/\n\s*\n/)
    .map(
      (p) => `<p style="margin:0 0 16px;white-space:pre-line">${escape(p)}</p>`,
    )
    .join(
      "",
    )}<div style="margin:28px 0;padding:22px;background:#f6f6f3;border:1px solid #e5e5df;border-radius:8px"><h2 style="margin:0 0 8px;font-size:17px">${escape(request.title)}</h2><p style="margin:0 0 16px;font-size:13px;color:#626869">${escape(due)}</p><ol style="margin:0;padding-left:21px">${questions.map((q: string) => `<li style="padding:0 0 12px 4px">${escape(q)}</li>`).join("")}</ol></div><p style="font-size:11px;letter-spacing:1px;color:#566e74">01 READ THE PROMPTS · 02 RECORD OR TYPE · 03 REVIEW &amp; SEND</p><p>${escape(how)}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr><td style="border-radius:6px;background:#242829"><a href="${escape(url)}" style="display:inline-block;padding:14px 22px;color:#fff;font-size:14px;font-weight:bold;text-decoration:none">Open your private response page →</a></td></tr></table><p style="font-size:12px;color:#656b6d">${escape(security)}</p><p style="font-size:12px;color:#656b6d">If you were not expecting this invitation, contact your advisor before continuing.</p></td></tr><tr><td style="padding:20px 32px;border-top:1px solid #e7e6e1;font-size:11px;color:#717576">DutyGraph · A clearer view of the work.<br>If the button does not open, copy this private link:<br><a href="${escape(url)}" style="color:#526b72;word-break:break-all">${escape(url)}</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
