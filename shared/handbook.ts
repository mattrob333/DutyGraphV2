// A deliberately small Markdown subset for our authored handbook. Raw HTML is
// always escaped. The same renderer produces the in-app and portable manuals.
export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function safeLink(value: string) {
  const url = value.trim();
  if (/^(https?:\/\/|#[a-z0-9-]+$)/i.test(url)) return url;
  if (
    /^(?:\.\/)?[a-z0-9][a-z0-9_./-]*\.(?:md|html|pdf|zip|json|csv)(?:#[a-z0-9-]+)?$/i.test(
      url,
    ) &&
    !url.includes("..")
  )
    return url;
  return "#";
}
function inline(text: string) {
  return escapeHtml(text).replace(
    /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g,
    (_all, code, bold, label, href) => {
      if (code) return `<code>${code}</code>`;
      if (bold) return `<strong>${bold}</strong>`;
      return `<a href="${escapeHtml(safeLink(href))}">${label}</a>`;
    },
  );
}
export function markdownToHtml(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const html: string[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++)
        code.push(lines[i]);
      i++;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{1,4}) (.+)$/);
    if (heading) {
      html.push(
        `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`,
      );
      i++;
      continue;
    }
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[\s:|-]+\|$/)) {
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
      const headers = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|"))
        rows.push(cells(lines[i++]));
      html.push(
        `<div class="table-scroll"><table><thead><tr>${headers.map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
      continue;
    }
    if (/^(- |\d+\. )/.test(line)) {
      const ordered = /^\d/.test(line),
        items: string[] = [],
        regex = ordered ? /^\d+\. / : /^- /;
      while (i < lines.length && regex.test(lines[i]))
        items.push(inline(lines[i++].replace(regex, "")));
      const tag = ordered ? "ol" : "ul";
      html.push(
        `<${tag}>${items.map((item) => `<li>${item}</li>`).join("")}</${tag}>`,
      );
      continue;
    }
    if (line.startsWith("> ")) {
      html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      i++;
      continue;
    }
    const paragraph: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#|```|\||- |\d+\. |> )/.test(lines[i])
    )
      paragraph.push(lines[i++]);
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }
  return html.join("\n");
}
