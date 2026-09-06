# Advisor and participant journey audit

Checked September 6, 2026. This audit used a fictional local company, isolated API accounts, synthetic provider responses and a fake email transport. No real invitation was sent and no paid model call was made.

## Review perspectives

- **First-time advisor:** Can I tell what to do next, what each button changes, and where the result lands?
- **Unfamiliar participant:** Can I open my invitation, understand the questions, record or write, recover a draft, and know that my response was received?
- **Adversarial reviewer:** Can stale data, repeated clicks, another tenant, an incomplete AI result or a network failure create misleading or duplicate work?

## Section and action inventory

| Section | Actions inspected | Findings and resolution |
| --- | --- | --- |
| Overview | Main next-step links; workspace search; person search result | Next steps route to the relevant work. Generic activity language and record labels were sent to the main implementation owner for correction. |
| Discovery | Research topics; prepare contact note; save draft; kickoff notes; team dossiers; generate interviews; invitation preview; response review; task draft | Rebuilt as a staged flow. Research includes public material only before the meeting. Reviewed roster membership and duties define interview scope. Original and advisor-edited AI drafts are kept separately. |
| Company graph | Connected, Work flow, Org & duties; Reporting chart; people/duty inspection | Recorded reporting relationships remain separate from work handoffs. Singular person/task labels were corrected. |
| Task cards | Human/AI filters; task detail; linked systems; ownership and source references | Singular card counts corrected. Complete Discovery cards are reviewed once and become ready for human confirmation; incomplete cards remain proposed. |
| Workflows & cases | Workflow definition detail; case visibility; prerequisite review | The join rule now says whether all incoming steps must finish or one accepted path can continue. Sample cases remain clearly illustrative. |
| Strategy | Routed to a separate framework reviewer | Framework prompts, canvases, dependencies and report freshness were audited by the framework agent. See its tests and framework guide. |
| Agent governance | Agent proposal and missing-runtime state | Technical labels that obscured the next action were sent to the main implementation owner. A proposed AI role is not presented as a deployed agent. |
| Weekly review | Prepare update; participant selector; question editing; draft request state | Editable prompts, due date, person/team context and request counts replace opaque preparation. Preparing questions does not send an email or create a recurring schedule. |
| Deliverables | Prepare client report; record selection; preview; approval; snapshot and confirmed-only packet | Records are grouped and searchable. Suggested executive records provide a useful start. Print styling is flat and clear. Report approval still binds the exact content and audience. The main owner disabled empty confirmed packets. |
| System & connections | Provider status and connection routes | Stale “transcription pending” language was reported for correction. Configuration status is distinct from a live provider check. |
| Workspace settings | Provider accordions and configuration fields | Settings were inspected without reading or submitting actual credentials. Per-tenant encrypted storage and access controls are covered by tests. |
| Help & training | Hosted guide; article selector; Discovery/Deliverables links | Transcription and weekly guidance updated. Generated handbook assets must be rebuilt to show source-document changes. |
| Participant invitation | Branded email preview; private link; enrollment; personalized questions | HTML and text invitations include the actual request, recipient and preparation instructions. Email retries retain an idempotency key after uncertain transport errors. |
| Participant response | Record/pause/resume/finish; audio upload; typed draft; transcript review; submit/receipt | Recording or upload blocks request switching. Changing a clip clears the prior upload reference. Text, review choices and audio drafts are recoverable on the same device. Submission has an explicit receipt and preserves original audio. |
| Advisor audio recovery | Transcribe a returned recording; correct text; save reviewed evidence | Audio-only responses can enter Discovery after the advisor saves a reviewed transcript. The original response is unchanged. Duplicate reviews reuse the existing evidence; a different replacement requires retraction. |

## Executable checks

`tests/discovery-api.test.ts` covers the full public research → contact email → leadership reply → meeting notes → reviewed roster → personalized interviews → returned responses → task cards journey. It also checks newest-source selection, scope isolation, missing stages, consent, stale drafts, exact roster membership, duty reuse, manager clearing, reporting cycles, transaction rollback, concurrent apply, provider idempotency, daily limits, malformed output, audio-only recovery, reviewed draft persistence and expired dates.

`tests/participant-delivery.test.ts` checks email escaping and instructions, bounded multipart transcription requests, output handling and safe errors. Participant/API tests check invitation tokens, enrollment, tenant access, retry behavior, original audio, retention and report publication boundaries.

The final browser pass must load a fresh client bundle after the build. A long-lived SPA tab can retain older components and generated help content. Microphone permission behavior on each target browser, speech recognition quality and actual inbox delivery need live acceptance with the configured accounts; synthetic tests cannot prove those external outcomes.
