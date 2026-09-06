import { useEffect, useRef, isValidElement, type ReactNode } from "react";
import { X, ArrowRight, Inbox } from "lucide-react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function stateLabel(s: string) {
  return (
    (
      {
        illustrative: "Read-only example",
        awaiting_confirmation: "Awaiting confirmation",
        pending_review: "Needs review",
        constraint_hypothesis: "Constraint hypothesis",
        signed_constraint: "Reviewed diagnosis",
        missing_baseline: "Baseline missing",
        review_required: "Review required",
        not_deployed: "Not deployed",
        sent: "Link ready",
        reported: "Reported",
        proposed: "Proposed",
        confirmed: "Human confirmed",
        stale: "Needs fresh review",
        conflicting: "Conflict open",
      } as Record<string, string>
    )[s] || s.replaceAll("_", " ").replace(/^./, (x) => x.toUpperCase())
  );
}
export function State({ value }: { value: string }) {
  return (
    <Badge
      tone={
        ["confirmed", "complete", "accepted", "ready"].includes(value)
          ? "sage"
          : [
                "conflicting",
                "stale",
                "constraint_hypothesis",
                "missing_baseline",
                "review_required",
                "pending_review",
              ].includes(value)
            ? "amber"
            : ["returned", "sent"].includes(value)
              ? "blue"
              : "neutral"
      }
    >
      {stateLabel(value)}
    </Badge>
  );
}
export function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
  type = "button",
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  className?: string;
  title?: string;
}) {
  return (
    <button
      className={"btn " + (primary ? "primary " : "") + className}
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={28} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      {title && (
        <header className="panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const el = ref.current!;
    const prior = document.activeElement as HTMLElement;
    el.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      close.current();
    };
    el.addEventListener("cancel", cancel);
    return () => {
      el.removeEventListener("cancel", cancel);
      el.close();
      prior?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className={wide ? "wide" : ""}>
      <header className="modal-head">
        <div>
          {subtitle && <div className="eyebrow">{subtitle}</div>}
          <h2>{title}</h2>
        </div>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function Row({
  title,
  detail,
  children,
  onClick,
}: {
  title: string;
  detail?: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="record-row">
      <div className="grow">
        {onClick ? (
          <button className="text-link" onClick={onClick}>
            {title}
          </button>
        ) : (
          <strong>{title}</strong>
        )}
        {detail && <p>{detail}</p>}
      </div>
      {children}
      {onClick && (
        <button
          className="icon-btn"
          onClick={onClick}
          aria-label={"Open " + title}
        >
          <ArrowRight size={17} />
        </button>
      )}
    </div>
  );
}
export function Field({
  label,
  children,
  wide = false,
  hint,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  hint?: string;
}) {
  const singleControl =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type);
  if (!singleControl)
    return (
      <fieldset className={"field field-group " + (wide ? "full" : "")}>
        <legend>{label}</legend>
        {children}
        {hint && <small>{hint}</small>}
      </fieldset>
    );
  return (
    <label className={"field " + (wide ? "full" : "")}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="notice danger" role="alert">
      {error}
    </div>
  ) : null;
}
export const date = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
