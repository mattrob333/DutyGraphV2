import type { RecordRow } from "../../shared/domain.ts";

const clean = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");

/** Advisory notice only: names and email addresses do not establish identity. */
export function DuplicatePeopleNotice({ records }: { records: RecordRow[] }) {
  const people = records.filter((r) => r.kind === "person");
  const contacts = people.filter(
    (r) =>
      r.data.role === "Engagement contact" &&
      r.data.team === "Not yet provided",
  );
  const team = people.filter((r) => !contacts.includes(r));
  if (!contacts.length || !team.length) return null;
  return (
    <aside className="notice" aria-label="Check contact identity">
      <strong>Does your contact also appear in the team?</strong>
      <p>
        The roster links people by email. A personal address and a work address
        can leave two records for one person. Check the details before changing
        either record.
      </p>
      {contacts.map((contact) => {
        const matches = team.filter(
          (person) =>
            (!!clean(contact.data.email) &&
              clean(contact.data.email) === clean(person.data.email)) ||
            (!!clean(contact.data.name || contact.title) &&
              clean(contact.data.name || contact.title) ===
                clean(person.data.name || person.title)),
        );
        return (
          <div key={contact.id}>
            <p>
              <strong>{contact.data.name || contact.title}</strong> ·{" "}
              {contact.data.email || "Email not supplied"} · Engagement contact
            </p>
            {matches.length ? (
              <ul>
                {matches.map((person) => (
                  <li key={person.id}>
                    {person.data.name || person.title} ·{" "}
                    {person.data.email || "Email not supplied"} ·{" "}
                    {person.data.role || "Role not supplied"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                No exact name or email match was found. Different names or
                addresses need your review.
              </p>
            )}
          </div>
        );
      })}
      <small>
        No records have been merged. Confirm identity and review linked
        responses before making changes.
      </small>
    </aside>
  );
}
