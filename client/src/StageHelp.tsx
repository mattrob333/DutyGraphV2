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
        if (node?.matches(":hover") || tip.current?.matches(":hover")) return;
        setOpen(false);
      }, 200);
  };
  useLayoutEffect(() => {
    if (!open || !trigger.current || !tip.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const gap = 8,
      edge = 12;
    const below = Math.max(0, window.innerHeight - rect.bottom - gap - edge);
    const above = Math.max(0, rect.top - gap - edge);
    const height = Math.min(360, tip.current.scrollHeight);
    const useBelow = below >= height || below >= above;
    const maxHeight = Math.min(360, useBelow ? below : above);
    setPosition({
      left: Math.max(
        edge,
        Math.min(rect.left, window.innerWidth - tip.current.offsetWidth - edge),
      ),
      top: useBelow
        ? rect.bottom + gap
        : rect.top - gap - Math.min(height, maxHeight),
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
        aria-describedby={open ? id : undefined}
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
            role="tooltip"
            className="stage-help-popover"
            style={position}
            onMouseEnter={cancel}
            onMouseLeave={leave}
          >
            <small>{guide.label}</small>
            <strong>{stage.name}</strong>
            <p>{guide.summary}</p>
            {!!guide.examples.length && (
              <ul>
                {guide.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            )}
            <footer>
              A stage groups duties across roles. These examples do not assign
              work.
            </footer>
          </div>,
          document.body,
        )}
    </>
  );
}
