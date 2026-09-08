import type { AuditBrief } from "../shared/audit-brief.ts";

const escape = (value: unknown) =>
  String(value ?? "Not recorded")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** Presentation of the safe, frozen audit snapshot; no live fetches or scripts. */
export function renderAuditSnapshot(
  brief?: Omit<AuditBrief, "reportProposal">,
) {
  if (!brief) return "";
  const stages = brief.stages || [],
    priorities = brief.priorities || [],
    commitments = brief.commitments || [],
    metrics = brief.metrics || [];
  const more = (shown: number, total: number) =>
    total > shown
      ? `<p class="muted">Showing ${shown} of ${total}. The complete frozen summary is included in report.json.</p>`
      : "";
  return `<section id="business-coverage" class="report-section"><div class="section-label">THE WORK AT A GLANCE</div><h2>Coverage across the business</h2><p class="muted">${escape(brief.coverage.duties)} duties · ${escape(brief.coverage.tasks)} tasks · ${escape(brief.coverage.stagesWithWork)} of ${escape(brief.coverage.stages)} stages with linked work. These describe audit coverage, not operating performance.</p>
    <div class="report-stages">${stages.map((stage, i) => `<div><span class="section-label">${String(i + 1).padStart(2, "0")}</span><h3>${escape(stage.label)}</h3><p>${escape(stage.duties)} duties · ${escape(stage.tasks)} tasks</p><small>${stage.gapCount ? `${escape(stage.gapCount)} documentation gaps` : stage.tasks ? "Work linked" : "Work not documented"}</small></div>`).join("") || "<p>Business stages have not been recorded.</p>"}</div></section>
    <section id="focus-priorities" class="report-section"><div class="section-label">WHERE TO FOCUS</div><h2>Questions and findings to act on</h2>${
      priorities
        .slice(0, 6)
        .map(
          (item, i) =>
            `<div class="report-priority"><span class="report-number">${String(i + 1).padStart(2, "0")}</span><div><span class="section-label">${item.source === "reviewed_analysis" ? "Advisor-reviewed hypothesis" : item.kind === "conflict" ? "Conflicting accounts" : item.source === "record_gap" ? "Documentation gap" : "Recorded hypothesis"}</span><h3>${escape(item.title)}</h3><p>${escape(item.detail)}</p><p class="report-action"><strong>Next action</strong> ${escape(item.nextAction)}</p></div></div>`,
        )
        .join("") ||
      "<p>No current findings are selected. Review evidence coverage before concluding the audit.</p>"
    }${more(Math.min(6, priorities.length), priorities.length)}
    ${brief.omitted?.priorities ? `<p class="muted">${escape(brief.omitted.priorities)} additional priorities were outside the snapshot limit and remain in the workspace.</p>` : ""}</section>
    <section id="next-review" class="report-section"><div class="section-label">THE FOLLOW-THROUGH</div><h2>Commitments for the next review</h2>${
      commitments.length
        ? `<table class="commitment-table"><thead><tr><th>Action</th><th>Owner</th><th>Review date</th></tr></thead><tbody>${commitments
            .slice(0, 8)
            .map(
              (item) =>
                `<tr><td><strong>${escape(item.title)}</strong><p>${escape(item.action)}</p></td><td>${escape(item.owner)}</td><td>${escape(item.dueDate || "To agree")}${item.overdue ? "<br><small>Overdue at report preparation</small>" : ""}</td></tr>`,
            )
            .join("")}</tbody></table>`
        : "<p>Agree the next decision, accountable owner and review date with the client. No commitments have been recorded yet.</p>"
    }${more(Math.min(8, commitments.length), commitments.length)}
    <h3 class="report-subheading">How progress will be checked</h3>${
      metrics.length
        ? `<div class="report-measures">${metrics
            .slice(0, 6)
            .map(
              (metric) =>
                `<div><h3>${escape(metric.title)}</h3><strong>${metric.latestObservation ? escape(metric.latestObservation.value) : "Awaiting data"}</strong><span>${metric.latestObservation ? "Latest recorded · " + escape(metric.unit) + " · " + escape(metric.latestObservation.observedAt.slice(0, 10)) : "No observations recorded"}</span><p>Baseline${metric.baseline === null ? " needed" : ": " + escape(metric.baseline) + " " + escape(metric.unit)}<br>${metric.target === null ? "Target not set" : `Target: ${escape(metric.target)} ${escape(metric.unit)}`}</p><small>${escape(metric.owner || "Owner not recorded")} · ${escape(metric.observationCount)} observations recorded</small></div>`,
            )
            .join("")}</div>`
        : "<p>No measures are defined. Establish a baseline and a review window before claiming improvement.</p>"
    }${more(Math.min(6, metrics.length), metrics.length)}
    <div class="report-continuity"><h3>A working agenda beyond the audit</h3><ol><li><strong>Review the evidence.</strong> Close the next gap and record what changed.</li><li><strong>Choose the next move.</strong> Carry accepted evidence into Strategy and collect its missing inputs.</li><li><strong>Test and return.</strong> Assign an owner, observe the result, and review the next decision.</li></ol><p class="muted">This report is a fixed snapshot. The company workspace holds the live brief and subsequent review records. Agree the scope and cadence of continuing work with the client.</p></div></section>`;
}
