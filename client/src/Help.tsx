import { useMemo, useState } from "react";
import { BookOpen, Search, Printer, ArrowRight } from "lucide-react";
import { Button, Empty, Heading } from "./ui.tsx";
import { markdownToHtml } from "../../shared/handbook.ts";
const files = import.meta.glob("../../docs/guide/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const articles = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, text]) => ({
    id: path.split("/").pop()!,
    title: text.match(/^# (.+)/)?.[1] || path,
    text,
  }));
export function Help({ go }: { go: (page: string) => void }) {
  const [selected, setSelected] = useState(articles[0]?.id || ""),
    [query, setQuery] = useState("");
  const matches = articles.filter((a) =>
    (a.title + " " + a.text).toLowerCase().includes(query.toLowerCase().trim()),
  );
  const current = articles.find((a) => a.id === selected) || articles[0];
  const html = useMemo(() => markdownToHtml(current?.text || ""), [current]);
  return (
    <>
      <Heading
        eyebrow="ADVISOR LEARNING CENTER"
        title="From first conversation to client delivery."
        description="A guided walkthrough, a complete manual, and practice exercises for the current application."
        actions={
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            Print this guide
          </Button>
        }
      />
      <div className="help-shortcuts">
        <Button onClick={() => go("discovery")}>
          Open Discovery <ArrowRight size={15} />
        </Button>
        <Button onClick={() => go("deliverables")}>
          Open Deliverables <ArrowRight size={15} />
        </Button>
        <a
          className="btn"
          href="/handbook/index.html"
          target="_blank"
          rel="noopener"
        >
          Open portable handbook <BookOpen size={15} />
        </a>
      </div>
      <div className="help-layout">
        <aside className="help-nav">
          <label className="help-search">
            <Search size={16} />
            <input
              aria-label="Search help and training"
              placeholder="Search the handbook…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <nav aria-label="Help articles">
            {matches.map((a) => (
              <button
                key={a.id}
                aria-current={selected === a.id ? "page" : undefined}
                onClick={() => {
                  setSelected(a.id);
                  document
                    .querySelector(".help-article")
                    ?.scrollIntoView({ block: "start" });
                }}
              >
                <BookOpen size={16} />
                <span>{a.title}</span>
              </button>
            ))}
          </nav>
          {!matches.length && (
            <Empty
              title="No matching guide"
              detail="Try a term such as confirmation, handoff, backup or report."
            />
          )}
          <p className="subtle">
            Release 0.2 · Local advisor pilot
            <br />
            Examples use fictional people and measurements.
          </p>
        </aside>
        <article
          className="help-article handbook"
          aria-label={current?.title}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  );
}
