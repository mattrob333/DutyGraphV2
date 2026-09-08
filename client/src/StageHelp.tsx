import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import {
  stageGuidance,
  type GuidedStage,
} from "../../shared/stage-guidance.ts";
import "./stage-help.css";

export function StageHelp({
  stage,
  stream,
}: {
  stage: GuidedStage;
  stream: { templateId?: string; id?: string; name?: string; label?: string };
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 360 });
  const pinned = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement>(null),
    tip = useRef<HTMLDivElement>(null);
  const id = useId(),
    guide = stageGuidance(stage, stream);
  const cancel = () => {
    clearTimeout(timer.current);
  };
  const close = () => {
    cancel();
    pinned.current = false;
    setOpen(false);
  };
  const show = () => {
    cancel();
    setOpen(true);
  };
  const leave = () => {
    cancel();
    if (!pinned.current)
      timer.current = setTimeout(() => {
        const node =
          trigger.current?.closest(
            ".snapshot-flow li, .swm-stage-picker li, .business-flow-preview > span",
          ) || trigger.current;
        if (
          node?.matches(":hover, :focus-within") ||
          tip.current?.matches(":hover, :focus-within")
        )
          return;
        setOpen(false);
      }, 200);
  };
  useLayoutEffect(() => {
    if (!open || !trigger.current || !tip.current) return;
    const rect = trigger.current.getBoundingClientRect();
    // Keep help outside the whole stage. Anchoring to the small info icon
    // can cover the next stage and intercept a click across the ribbon.
    const anchor = trigger.current.closest(
      ".snapshot-flow li, .swm-stage-picker li, .business-flow-preview > span",
    );
    const stageRect = anchor?.getBoundingClientRect() || rect;
    const gap = 8,
      edge = 12;
    const below = Math.max(
      0,
      window.innerHeight - stageRect.bottom - gap - edge,
    );
    const above = Math.max(0, stageRect.top - gap - edge);
    const height = Math.min(360, tip.current.scrollHeight);
    const useBelow = below >= height || below >= above;
    const maxHeight = Math.min(360, useBelow ? below : above);
    setPosition({
      left: Math.max(
        edge,
        Math.min(rect.left, window.innerWidth - tip.current.offsetWidth - edge),
      ),
      top: useBelow
        ? stageRect.bottom + gap
        : stageRect.top - gap - Math.min(height, maxHeight),
      maxHeight,
    });
  }, [open, stage.name]);
  useEffect(() => {
    const node =
      trigger.current?.closest(
        ".snapshot-flow li, .swm-stage-picker li, .business-flow-preview > span",
      ) || trigger.current;
    node?.addEventListener("mouseenter", show);
    node?.addEventListener("mouseleave", leave);
    return () => {
      node?.removeEventListener("mouseenter", show);
      node?.removeEventListener("mouseleave", leave);
    };
  }, [stage.name]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (
        !trigger.current?.contains(e.target as Node) &&
        !tip.current?.contains(e.target as Node)
      )
        close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    const scroll = (e: Event) => {
      if (!tip.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="stage-help-trigger"
        aria-label={`About ${stage.name || "this business stage"}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? id : undefined}
        onFocus={show}
        onBlur={leave}
        onClick={(e) => {
          e.stopPropagation();
          if (pinned.current) close();
          else {
            pinned.current = true;
            show();
          }
        }}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={tip}
            id={id}
            role="dialog"
            aria-label={`Why this stage? ${stage.name || "Business stage"}`}
            className="stage-help-popover"
            style={position}
            onMouseEnter={cancel}
            onMouseLeave={leave}
            onFocus={cancel}
            onBlur={leave}
          >
            <small>{guide.label}</small>
            <strong>{stage.name}</strong>
            <p>{guide.summary}</p>
            {stage.provenance && (
              <section className="stage-help-evidence">
                <h4>Why this stage?</h4>
                <p>{stage.provenance.rationale}</p>
                {!stage.provenance.citations.some(
                  (citation) => citation.kind === "company_reported",
                ) && <p>Company practice is unconfirmed for this stage.</p>}
                {!stage.provenance.citations.some(
                  (citation) => citation.kind === "peer_example",
                ) && (
                  <p>No documented peer example was captured for this stage.</p>
                )}
                {stage.provenance.citations.map((citation, index) => (
                  <article key={`${citation.sourceId}-${index}`}>
                    <small>
                      {citation.kind === "company_reported"
                        ? "Company-reported evidence"
                        : "Peer example · company practice unconfirmed"}
                    </small>
                    <b>{citation.subject}</b>
                    <p>{citation.relevance}</p>
                    <blockquote>{citation.quote}</blockquote>
                    {citation.url ? (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {citation.title || citation.sourceId}
                      </a>
                    ) : (
                      <span>
                        {citation.title || "Supplied company description"}
                      </span>
                    )}
                    <small>Source: {citation.sourceId}</small>
                    <small>
                      Published: {citation.publishedDate || "Date not stated"} ·
                      Retrieved: {citation.retrievedAt || "Date not recorded"}
                    </small>
                  </article>
                ))}
                {!stage.provenance.citations.length && (
                  <p>
                    No supporting stage source was captured. This grouping is an
                    AI suggestion to confirm.
                  </p>
                )}
                {!!stage.provenance.unknowns.length && (
                  <>
                    <h4>Still to confirm</h4>
                    <ul>
                      {stage.provenance.unknowns.map((unknown) => (
                        <li key={unknown}>{unknown}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}
            {!!guide.examples.length && (
              <ul>
                {guide.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            )}
            <footer>
              {stage.provenance
                ? "This grouping is proposed. Reported practices and matching passages do not establish success or assign work at this company."
                : "A stage groups duties across roles. These authored examples do not assign work or establish company practice."}
            </footer>
          </div>,
          document.body,
        )}
    </>
  );
}
