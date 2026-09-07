import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const script = readFileSync(
  new URL("../client/public/measurement/measurement.js", import.meta.url),
  "utf8",
);
function harness(
  options: {
    saved?: string;
    blocked?: boolean;
    noindex?: boolean;
    origin?: string;
    id?: string;
    storageThrows?: boolean;
  } = {},
) {
  const listeners: Record<string, (e: any) => void> = {};
  class Element {
    id = "";
    src = "";
    async = false;
    hidden = false;
    disabled = false;
    textContent = "";
    className = "";
    type = "";
    innerHTML = "";
    dataset: Record<string, string> = {};
    children: Element[] = [];
    events: Record<string, (e?: any) => void> = {};
    attributes: Record<string, string> = {};
    focused = false;
    append(element: Element) {
      this.children.push(element);
    }
    setAttribute(k: string, v: string) {
      this.attributes[k] = v;
    }
    addEventListener(k: string, v: (e?: any) => void) {
      this.events[k] = v;
    }
    focus() {
      this.focused = true;
    }
    querySelector(q: string) {
      return q.includes("declined")
        ? decline
        : q.includes("accepted")
          ? accept
          : status;
    }
    querySelectorAll() {
      return [accept, decline];
    }
  }
  const accept = new Element(),
    decline = new Element(),
    status = new Element(),
    head = new Element(),
    body = new Element(),
    footer = new Element(),
    form = new Element();
  accept.dataset.choice = "accepted";
  decline.dataset.choice = "declined";
  const location = {
    origin: options.origin || "https://dutygraph.com",
    hostname: "dutygraph.com",
    href: "https://dutygraph.com/landing/?email=private@example.com&token=private-token#private-answer",
  };
  const config = {
    measurementId: options.id === undefined ? "G-TEST123456" : options.id,
    origin: "https://dutygraph.com",
    path: "/landing/",
    title: "DutyGraph",
    group: "landing",
    downloads: ["/learn/agent-manifest.json"],
  };
  const cookieWrites: string[] = [];
  let saved = options.saved || null;
  const document = {
    head,
    body,
    querySelector: (q: string) =>
      q === "#dutygraph-measurement"
        ? { textContent: JSON.stringify(config) }
        : q.startsWith("meta")
          ? options.noindex
            ? { content: "noindex,nofollow" }
            : null
          : q === "footer"
            ? footer
            : q === "#pilot-form"
              ? form
              : null,
    createElement: () => new Element(),
    addEventListener: (key: string, callback: (e: any) => void) => {
      listeners["document:" + key] = callback;
    },
    get cookie() {
      return "_ga=example; _ga_TEST123456=example; session=keep";
    },
    set cookie(value: string) {
      cookieWrites.push(value);
    },
  };
  const window: any = {
    addEventListener: (key: string, callback: (e: any) => void) => {
      listeners[key] = callback;
    },
  };
  const localStorage = {
    getItem: () => {
      if (options.storageThrows) throw Error("blocked");
      return saved;
    },
    setItem: (_k: string, v: string) => {
      if (options.storageThrows) throw Error("blocked");
      saved = v;
    },
  };
  runInNewContext(script, {
    window,
    document,
    navigator: { globalPrivacyControl: options.blocked },
    location,
    localStorage,
    URL,
    Date,
  });
  const commands = () =>
    Array.from(window.dataLayer || [], (a: any) => Array.from(a)) as any[][];
  const events = () => commands().filter((a) => a[0] === "event");
  return {
    window,
    listeners,
    form,
    accept,
    decline,
    body,
    head,
    footer,
    commands,
    events,
    cookieWrites,
    config,
  };
}
test("measurement sends nothing before consent and keeps private and preview pages off", () => {
  for (const options of [
    {},
    { saved: JSON.stringify({ choice: "declined", at: Date.now() }) },
    { blocked: true },
    { noindex: true },
    { origin: "https://preview.example" },
    { id: "" },
  ]) {
    const h = harness(options);
    assert.equal(h.head.children.length, 0);
    assert.equal(h.events().length, 0);
  }
});
test("accepted measurement uses canonical public metadata and enumerated actions only", () => {
  const h = harness();
  h.accept.events.click();
  assert.equal(h.head.children.length, 1);
  assert.deepEqual(
    h.events().map((e) => e[1]),
    ["page_view"],
  );
  h.form.events.focusin();
  h.form.events.focusin();
  h.listeners["dutygraph:pilot-receipt"]({
    detail: {
      inquiryType: "pilot",
      email: "private@example.com",
      answer: "private-answer",
    },
  });
  h.listeners["dutygraph:pilot-receipt"]({
    detail: { inquiryType: "private-answer" },
  });
  h.listeners["document:click"]({
    target: {
      closest: () => ({
        href: "https://dutygraph.com/learn/agent-manifest.json?email=private@example.com",
      }),
    },
  });
  h.listeners["document:click"]({
    target: {
      closest: () => ({
        href: "https://dutygraph.com/?demo=discovery&token=private-token",
      }),
    },
  });
  h.listeners["document:click"]({
    target: {
      closest: () => ({
        href: "https://dutygraph.com/?sample=agent-governance#governance",
      }),
    },
  });
  h.listeners["document:click"]({
    target: {
      closest: () => ({ href: "https://dutygraph.com/invite/private-token" }),
    },
  });
  assert.deepEqual(
    h.events().map((e) => e[1]),
    [
      "page_view",
      "pilot_form_start",
      "pilot_receipt",
      "worksheet_download",
      "demo_open",
      "demo_open",
    ],
  );
  assert.equal(h.events().at(-1)![2].demo_type, "governance");
  assert.doesNotMatch(
    JSON.stringify(h.commands()),
    /private@example|private-answer|private-token/,
  );
  const config = h.commands().find((c) => c[0] === "config")![2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.page_referrer, "");
});
test("revoking consent disables collection, clears only analytics cookies and propagates across tabs", () => {
  const h = harness();
  h.accept.events.click();
  const count = h.events().length;
  h.decline.events.click();
  h.listeners["dutygraph:newsletter-receipt"]({});
  assert.equal(h.events().length, count);
  assert.equal(h.window["ga-disable-G-TEST123456"], true);
  assert.ok(h.cookieWrites.length > 0);
  assert.ok(h.cookieWrites.every((c) => c.startsWith("_ga")));
  h.accept.events.click();
  assert.equal(h.head.children.length, 1);
  assert.equal(h.events().length, count);
  h.listeners.storage({
    key: "dutygraph-analytics-consent-v1",
    newValue: null,
  });
  h.listeners["dutygraph:newsletter-receipt"]({});
  assert.equal(h.events().length, count);
});
test("expired consent requires a new choice and unavailable storage does not break measurement", () => {
  const expired = harness({
    saved: JSON.stringify({
      choice: "accepted",
      at: Date.now() - 181 * 86400000,
    }),
  });
  assert.equal(expired.events().length, 0);
  assert.equal(expired.body.children[0].hidden, false);
  const future = harness({
    saved: JSON.stringify({ choice: "accepted", at: Date.now() + 86400000 }),
  });
  assert.equal(future.events().length, 0);
  const h = harness({ storageThrows: true });
  assert.doesNotThrow(() => h.accept.events.click());
  assert.equal(h.events().length, 1);
});
