import { useRef, useState } from "react";
import {
  kickoffFields,
  type KickoffPreparation as Package,
} from "../../shared/kickoff-preparation.ts";
import { previewRoster } from "../../shared/roster.ts";
import {
  emptyManualPerson,
  writeManualRoster,
} from "../../shared/manual-roster.ts";
import { Button, Panel, Field, ErrorBox } from "./ui.tsx";
import "./kickoff-preparation.css";

export function KickoffPreparation({
  value,
  change,
  voiceAvailable = true,
}: {
  voiceAvailable?: boolean;
  value: Package;
  change: (value: Package) => void;
}) {
  const editorRef = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  const [person, setPerson] = useState(emptyManualPerson);
  const [editIndex, setEditIndex] = useState<number | undefined>();
  const [executive, setExecutive] = useState(false),
    [pilot, setPilot] = useState(true);
  const [added, setAdded] = useState(false);
  const preview = value.csv.trim() ? previewRoster(value.csv) : null;
  function resetEditor() {
    setPerson(emptyManualPerson());
    setEditIndex(undefined);
    setExecutive(false);
    setPilot(true);
  }
  function savePerson() {
    try {
      const csv = writeManualRoster(
        value.csv,
        {
          ...person,
          email: person.email.trim(),
          managerEmail: person.managerEmail.trim(),
        },
        editIndex,
      );
      const oldEmail =
        editIndex === undefined ? "" : preview?.rows[editIndex]?.data.email;
      const email = person.email.trim().toLowerCase();
      change({
        ...value,
        csv,
        executiveEmails: [
          ...value.executiveEmails.filter((e) => e !== oldEmail && e !== email),
          ...(executive ? [email] : []),
        ],
        participantEmails: [
          ...value.participantEmails.filter(
            (e) => e !== oldEmail && e !== email,
          ),
          ...(pilot ? [email] : []),
        ],
      });
      resetEditor();
      setError("");
      setAdded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the person's fields.");
    }
  }
  function select(
    key: "executiveEmails" | "participantEmails",
    email: string,
    checked: boolean,
  ) {
    change({
      ...value,
      [key]: checked
        ? [...value[key], email]
        : value[key].filter((e) => e !== email),
    });
  }
  return (
    <Panel
      title="Prepare our two-hour executive kickoff"
      subtitle="Upload the team list, choose who should participate, and share the leadership context. Your advisor reviews this package before importing people."
    >
      <div className="kickoff-package">
        <section>
          <h3>1. Bring the team into view</h3>
          <p>
            Preferred: upload a CSV of everyone participating in discovery,
            including their managers, to build the reporting org chart. Columns:
            name, email, role or title, department, manager_email. Leave
            manager_email blank when no manager is recorded. Include managers in
            the file. Maximum 500 people / 500 KB.
          </p>
          <a
            download="dutygraph-team-template.csv"
            href={
              "data:text/csv;charset=utf-8," +
              encodeURIComponent(
                "name,email,role,department,manager_email\nAlex Example,alex@example.com,Managing director,Leadership,\nSam Example,sam@example.com,Department head,Operations,alex@example.com\n",
              )
            }
          >
            Download CSV template
          </a>
          <Field label="Upload team CSV">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 500000)
                    throw new Error("Choose a CSV smaller than 500 KB.");
                  const csv = await file.text();
                  resetEditor();
                  setManual(false);
                  change({
                    ...value,
                    csv,
                    executiveEmails: [],
                    participantEmails: [],
                  });
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </Field>
          <p>
            No CSV? Add people one at a time with the same reporting
            information.
          </p>
          <Button
            onClick={() => {
              setManual(true);
              resetEditor();
              setAdded(false);
            }}
          >
            Add participants manually
          </Button>
          {manual && (
            <section
              className="manual-roster-editor"
              aria-label="Add or edit participant"
              ref={editorRef}
            >
              <h4>
                {editIndex === undefined
                  ? "Add a participant"
                  : "Edit participant"}
              </h4>
              <div className="manual-roster-fields">
                {(
                  [
                    ["name", "Full name"],
                    ["email", "Email"],
                    ["role", "Role / title"],
                    ["team", "Department"],
                    ["managerEmail", "Reports to (manager email)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      aria-label={`Participant ${label}`}
                      type="text"
                      maxLength={
                        key === "email" || key === "managerEmail" ? 254 : 200
                      }
                      value={person[key]}
                      onChange={(e) =>
                        setPerson({ ...person, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="subtle">
                Use the manager's email to connect the org chart. Include that
                manager as a person too. Leave blank only if there is no manager
                to record.
              </p>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={executive}
                  onChange={(e) => setExecutive(e.target.checked)}
                />{" "}
                Include in the executive kickoff attendee list
              </label>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={pilot}
                  onChange={(e) => setPilot(e.target.checked)}
                />{" "}
                Include in pilot discovery
              </label>
              <p className="subtle">
                These selections prepare the attendee list for advisor review.
                They do not send invitations.
              </p>
              <div className="actions">
                <Button onClick={savePerson}>
                  {editIndex === undefined
                    ? "Add participant"
                    : "Save participant"}
                </Button>
                <Button
                  onClick={() => {
                    resetEditor();
                    setManual(false);
                  }}
                >
                  Close manual entry
                </Button>
              </div>
              {added && (
                <p role="status">
                  Participant added. Enter the next person above, or{" "}
                  <button
                    type="button"
                    onClick={() => {
                      resetEditor();
                      setAdded(false);
                    }}
                  >
                    Add another
                  </button>
                  .
                </p>
              )}
            </section>
          )}
          <details>
            <summary>Paste CSV instead</summary>
            <Field label="Team CSV text">
              <textarea
                aria-label="Team CSV text"
                rows={5}
                maxLength={500000}
                value={value.csv}
                onChange={(e) => {
                  resetEditor();
                  setManual(false);
                  change({
                    ...value,
                    csv: e.target.value,
                    executiveEmails: [],
                    participantEmails: [],
                  });
                }}
              />
            </Field>
          </details>
          <ErrorBox error={error} />
          {preview && (
            <>
              <p role="status">
                {preview.rows.length} people · {preview.validCount} valid rows
              </p>
              {preview.errors.map((e) => (
                <p className="notice" key={e}>
                  {e}
                </p>
              ))}
              <button
                type="button"
                onClick={() => {
                  resetEditor();
                  setError("");
                  change({
                    ...value,
                    csv: "",
                    executiveEmails: [],
                    participantEmails: [],
                  });
                }}
              >
                Clear roster
              </button>
            </>
          )}
          {!value.csv && (
            <Field label="If the roster is not ready, who will supply it and when?">
              <textarea
                maxLength={2000}
                value={value.rosterUnavailableReason}
                onChange={(e) =>
                  change({ ...value, rosterUnavailableReason: e.target.value })
                }
              />
            </Field>
          )}
        </section>
        {preview && (
          <section>
            <h3>2. Choose the people for each conversation</h3>
            <p>
              Executive kickoff: sponsor, executives, department heads and
              relevant board members who set direction and responsibilities.
              Pilot discovery: the people whose daily work we will examine.
              Someone can be in both groups. Selecting a person does not email
              them.
            </p>
            <div className="kickoff-roster-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Person / role</th>
                    <th>Department / reports to</th>
                    <th>Executive kickoff</th>
                    <th>Pilot discovery</th>
                    <th>Edit roster</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{r.data.name}</strong>
                        <br />
                        {r.data.role}
                        <br />
                        <small>{r.data.email}</small>
                        {r.issues.map((issue) => (
                          <p className="notice" key={issue}>
                            Row {r.row}: {issue}
                          </p>
                        ))}
                      </td>
                      <td>
                        {r.data.team}
                        <br />
                        <small>
                          {r.data.managerEmail || "No manager stated"}
                        </small>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Executive kickoff: ${r.data.email}`}
                          disabled={!!r.issues.length}
                          checked={value.executiveEmails.includes(r.data.email)}
                          onChange={(e) =>
                            select(
                              "executiveEmails",
                              r.data.email,
                              e.target.checked,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Pilot discovery: ${r.data.email}`}
                          disabled={!!r.issues.length}
                          checked={value.participantEmails.includes(
                            r.data.email,
                          )}
                          onChange={(e) =>
                            select(
                              "participantEmails",
                              r.data.email,
                              e.target.checked,
                            )
                          }
                        />
                      </td>
                      <td>
                        <Button
                          onClick={() => {
                            setPerson(r.data);
                            setEditIndex(i);
                            setExecutive(
                              value.executiveEmails.includes(r.data.email),
                            );
                            setPilot(
                              value.participantEmails.includes(r.data.email),
                            );
                            setAdded(false);
                            setManual(true);
                            requestAnimationFrame(() =>
                              editorRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              }),
                            );
                          }}
                        >
                          Edit {r.data.name || "person"}
                        </Button>
                        <Button
                          onClick={() => {
                            try {
                              const csv = writeManualRoster(value.csv, null, i);
                              change({
                                ...value,
                                csv,
                                executiveEmails: value.executiveEmails.filter(
                                  (e) => e !== r.data.email,
                                ),
                                participantEmails:
                                  value.participantEmails.filter(
                                    (e) => e !== r.data.email,
                                  ),
                              });
                              resetEditor();
                              setError("");
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Remove {r.data.name || "person"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <section>
          <h3>3. Share the leadership context</h3>
          <p>
            Short bullets are enough. State “unknown” with a follow-up owner
            where necessary.{" "}
            {voiceAvailable && "You can add a voice response below."}
          </p>
          <div className="form-grid">
            {kickoffFields.map((f) => (
              <Field key={f.id} label={f.title} wide>
                <p className="subtle">{f.hint}</p>
                <textarea
                  aria-label={f.title}
                  rows={3}
                  maxLength={6000}
                  value={value.answers[f.id]}
                  onChange={(e) =>
                    change({
                      ...value,
                      answers: { ...value.answers, [f.id]: e.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}
