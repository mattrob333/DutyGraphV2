# From evidence to a better result

The Strategy page connects five steps: collect evidence, record a possible constraint, define a test, try an intervention, and review the outcome. A framework helps ask a question. It does not prove the answer.

## Use the constraint ledger

Each card states the suspected limit, why it is suspected, another explanation, what would change if it were removed, and how to test it. The Cobalt sample has two hypotheses. Neither is a proven constraint. Compare independent accounts and actual work records before selecting a diagnosis.

The Strategy assistant uses the existing OpenAI connection. Select up to eight sources, approve sending those excerpts, and request hypotheses. Review a result for the ledger. Complete the owner, output unit and missing fields before saving. The assistant does not review its own diagnosis. The separate framework library can run all sixteen analyses in dependency order when you select **Run remaining sequence**; it does not run unattended.

## Define a KPI

A key performance indicator (KPI) is a measure used to judge progress. Record its question, formula, unit, population, period, source, owner, baseline, target and guardrail.

For supplier onboarding, separate approval waiting time from total onboarding time. For fulfilment, consider on-time complete orders, shortage waiting time and rework. Choose measures that test the suspected constraint and protect quality. Record whether elapsed time means calendar hours or business hours. A baseline is measured; a target is a choice with a stated basis. Missing is not zero.

## Compare with competitors

No verified competitor benchmark dataset is loaded. Public research can establish a competitor list and its advertised offer. It rarely proves private operational cycle times, margins or staffing productivity.

Before comparing a measure, match the formula, units, segment, geography, period and population. Keep the source, publication date, collection method and comparability limits. Separate internal performance, competitor observations, industry references and management targets. Do not average incompatible measures or use AI estimates as measured facts.

The present metric form supports the internal measure. A dedicated, source-linked competitor benchmark register and automatic feeds remain to be built. Keep reviewed benchmark research in evidence and cite it in Industry Map and Balanced Scorecard / OKRs until then.

## Set objectives and key results

An objective states the result the business wants. Key results state measurable changes and dates. Use Balanced Scorecard / OKRs to connect the objective to the KPI definitions in Measurements. Task counts are not usually business results.

Illustrative structure: objective — make supplier onboarding reliable. Key result — reduce the defined approval wait from a measured baseline to an agreed target by a named date, without increasing verification errors. Establish the baseline before choosing the numbers. Keep the actions needed to reach the result in duties and task cards.

## Describe an intervention

An intervention is a specific change made to test an explanation. Record the suspected constraint, exact change, human owner, measure, prediction, review date and stop conditions.

Cobalt example: propose a named approval owner and one decision queue. Predict that waiting for approval will fall. Check whether total completed supplier onboarding rises, not just whether one queue gets shorter. Stop if authority remains disputed or control errors increase.

An outcome review compares the recorded prediction with observations. State the observation period, coverage and other changes that could explain the result. Choose supported, falsified or inconclusive. With no baseline or observations, use inconclusive.

## Prepare a weekly standup

Weekly review now prepares four questions from the selected person’s current tasks and measures. The advisor can review them as a participant request. Saving does not send email. The existing invitation flow can send a reviewed request using Resend. Participants can type or record a response, create an editable OpenAI transcript, and check it before sending. Their advisor must have an OpenAI key configured for transcription. The four draft questions and response due date can be edited before preparing the request. Status counts show draft, sent and returned weekly requests.

The intended full cycle is:

1. Before the meeting, draft questions from changes, unresolved decisions and missing measurements.
2. The advisor reviews recipients and questions. An approved schedule sends one invitation per person and meeting.
3. Participants send short updates. AI drafts an agenda with source links, decisions needed and a time limit per speaker.
4. The team meets. Fireflies captures the meeting when the configured account and recording permissions allow it.
5. A verified webhook identifies the completed transcript. Import it with meeting, speaker and time references, deduplicate it, and route it to Customer calls or People & work according to meeting type.
6. A person checks the transcript and proposed decisions. Accepted evidence creates new analysis versions and proposed work. It does not silently change duties or authorize agents.

The rule-based request draft is implemented. The scheduled invitation cycle, Fireflies import, AI meeting agenda and continuous framework refresh remain integration work. Participant audio transcription is available on demand; it does not run unattended. Monday at 10 am was an example, not a configured schedule.

## Review frameworks when needed

Each framework has a specific AI instruction set, named input requirements, a visual canvas, and a suggested review frequency. Open a card to read its canvas, inspect citations and confidence, or run a saved analysis with OpenAI. Relevant accepted evidence, public research and current upstream analyses are included automatically. You do not need to select source checkboxes. Manual advisor analyses remain available.

Customer frameworks respond to new interviews. Operational constraints and KPIs need weekly review. External-environment frameworks usually need less frequent review unless a material event occurs. These are suggested review times, not active schedules.

The app detects changed inputs and marks affected saved analyses out of date. A changed upstream analysis also makes its downstream analyses out of date, through the full dependency chain. Every required upstream analysis must be current before a dependent run starts. **Run remaining sequence** updates ready analyses in order, skips current ones, and stops if a run fails. It can make up to sixteen provider calls; charges apply. Each run saves its model, prompt version, exact inputs, citations, output, provider usage and outcome. A run does not confirm a constraint or change authoritative duties.

Scheduled refresh, automatic change summaries and notifications remain future work. See [Live framework canvases](24-live-framework-canvases.md) for all sixteen layouts, input limits and version history.

Sources: [ASD-STE100](https://www.asd-ste100.org/about_STE.html), [Porter’s Five Forces](https://www.isc.hbs.edu/strategy/business-strategy/Pages/the-five-forces.aspx), [Fireflies signed webhooks](https://docs.fireflies.ai/graphql-api/webhooks-v2).
