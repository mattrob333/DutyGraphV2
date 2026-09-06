# Strategy reports and the copilot

Open Strategy to understand the business without reading each framework separately.

## Read a report

1. Add evidence in Discovery. Review it and mark it accepted. Choose Business context, Leadership input, Customer calls, or People and work. Run the relevant framework canvases when you want their analysis included too.
2. In Strategy, select **Read executive brief** for the whole company. Use **Read report** beside a framework group for a focused view.
3. Select **Generate with OpenAI**. The app uses the API key and model in your account settings.
4. Read the overall picture, findings, suggested next steps, and open questions. Select a source link to check the record behind a finding. A citation to a generated framework opens that exact saved canvas version.
5. Use report history to compare saved drafts. AI reports do not overwrite your framework analyses, confirm a constraint, create duties, or authorize work.

A report is an AI interpretation. Inferred means the AI drew a conclusion from the sources. Assumed means a premise still needs checking. Missing means the required information was not supplied. A source may describe a belief rather than an established fact. A framework analysis is also an interpretation; citing it does not make its conclusions primary evidence.

## Read the underlying frameworks

Select any of the sixteen framework cards to open its recognizable canvas or table. The canvas shows findings, data gaps, confidence notes, supporting sources and next questions. Its input section explains which variables the framework needs and what the supplied material actually established. Use the saved-version selector to compare earlier runs. Manual advisor analyses remain available inside the canvas.

Each framework uses its own system instructions. All required upstream analyses must be complete and current. **Run remaining sequence** runs ready frameworks in order using the account's OpenAI key. An upstream change marks its dependent analyses out of date recursively. Old versions remain readable, but reports and the copilot exclude generated frameworks whose inputs are no longer current. The framework sequence has a separate limit of 32 attempts per account in 24 hours. See [Live framework canvases](24-live-framework-canvases.md).

## Ask the copilot

Select **Ask the copilot** to open the side drawer. Ask one strategic question, such as “What could delay delivery, and which evidence should we check first?” Each answer uses current company context. Questions are independent: earlier chat answers are not silently treated as facts or added to the next request. Saved answers remain in history.

## Understand update alerts

The Strategy page checks report input status each minute while it is visible. A new accepted source, changed source, withdrawn source, or changed saved analysis can show **Inputs changed** beside an existing report. A newly completed current framework run can also change report inputs. This is a prompt to refresh the report. It does not claim that AI has already read the change. A copilot answer does not replace or mark the executive brief current.

Report generation runs when you press the OpenAI button. Reports do not run on a daily schedule yet. The app checks source IDs, versions, hashes, and status. It labels older reports when their input set changes, including changes to records outside the excerpt limit.

## Context limits

Each request can use 24 accepted evidence excerpts and 24 analysis/work excerpts. Each excerpt is limited to 4,000 characters. The executive brief reserves space for all 16 canonical framework analyses before recent work records. Group reports use their relevant evidence buckets and framework group. Reports disclose omitted records. Workspaces above 1,000 records require a narrower context feature before these reports can run. The account limit is 20 strategy attempts in 24 hours, separate from discovery drafts. OpenAI charges apply. Provider failures are not retried automatically.

## Find places to watch

Discovery → Research now includes Company overview, Customer communities, Competitors & their channels, and Industry news & feeds. Community searches include Reddit and professional forums. Competitor searches look for alternative providers and their public channels. Industry searches look for trade news and feeds. These searches use Exa and retain source links and dates. Results need advisor review; a discovered URL is not automatically a verified competitor or an active subscription.

## Collection workflow to build next

The intended recurring flow is: collect → remove duplicates → retain source and date → review incoming evidence → identify affected framework groups → generate reports → notify the advisor about material changes.

Fireflies imports, leadership voice-note transcription, RSS subscriptions, permitted social/community collection, and daily jobs are not connected in this release. They need account connections, an explicit source list, a timezone and collection cadence, stored cursors, retry limits, and a run history. New raw material must remain separate from accepted company evidence. A proposed future automatic-report setting should disclose its source scope and spending limit before it starts. Do not describe a feed or scheduled agent as active until a successful run is recorded.
