# AI governance landscape — research report

**Prepared for:** DutyGraph editorial review
**Search and review date:** 2026-09-06 (all `accessedAt` and `reviewed` values are this date)
**Package:** `entries.json` (160), `evidence.json` (160), `taxonomy.json` (12), `candidates-to-review.json` (166)
**Status:** research output for editorial review. Nothing was published, no vendor was contacted, no form was submitted, no account was created, and no paid report was purchased.

---

## 1. What "verified" means here

Every published entry was checked against pages fetched during this research pass. **Verified means the entry and its cited claims were checked against sources — it does not mean the product was independently tested.** No product in this package was installed, benchmarked, or exercised.

Three support levels are used at claim level, and the distribution matters more than the headline count:

| `claims.support` | Count | Meaning |
|---|---|---|
| `documented` | 271 | An official documentation, repository, release-note or pricing page states the capability |
| `vendor_claim` | 166 | Only a marketing or product landing page states it |
| `independently_supported` | 7 | A non-vendor source corroborates it |
| `not_found` | 8 | No support was located. **This does not mean the capability is absent.** |

Source mix across 346 sources: 130 `official_docs`, 136 `official_product`, 38 `official_repository`, 31 `official_release`, 2 `official_pricing`, 2 `independent_reporting`, 7 `other`. 452 claims total, averaging 2.8 claims and 2.2 sources per entry, with a minimum of two claims and two sources — at least one official — for every entry.

**104 of 160 entries (65%) have at least one documentation or repository source.** The remaining 56 rest on official product pages. 38 entries have *no* `documented` or `independently_supported` claim at all; they are listed in §8 and should be treated as marketing-supported only.

---

## 2. Method

1. **Discovery.** Broad searches across all twelve categories and all major regions, deliberately reaching past the well-known names — non-US vendors, open-source projects, foundation-hosted tooling, and acquisition announcements.
2. **Parallel category passes.** Seven independent research passes ran against a single shared output spec so that evidence discipline was identical across categories: identity & access; runtime controls + agent security; AI risk + model governance; evaluation + observability; agent discovery + work delegation; data governance + agent building; advisory services + cross-cutting open source. A separate pass covered DutyGraph itself.
3. **Per-candidate verification.** Each candidate was then searched by name to confirm it still exists, its current name and owner, and the specific capability being claimed. Official documentation, API references, release notes, repositories, trust centres and pricing pages were preferred over marketing copy.
4. **Deduplication.** One entry per distinct product with a distinct buyer and use case. Suites were resolved to named products; renames and acquisitions were recorded rather than duplicated.
5. **Gap pass.** Underrepresented categories (work delegation, human approval as a product, consent for AI training data) were re-searched. Where the market genuinely does not supply products, that is reported as a finding rather than filled with near-misses.
6. **Validation.** A build script re-derives every category label from its ID, checks that every claim `sourceId` resolves inside its own record, checks that dates are real ISO dates, and enforces unique names and IDs with exactly one evidence record per entry. It reports **zero errors**.

### Coverage and limitations of the search itself

- **Language:** searches were conducted in English. Japanese, Korean, Chinese and continental-European-language vendor material was almost certainly under-sampled. The one Japanese entry (JDLA C認証) was found via English-language routes.
- **Discovery bias:** English-language search inherently favours US and UK vendors and vendors that invest in content marketing. A quiet vendor with good documentation and no marketing is systematically harder to find than a loud vendor with none.
- **Inaccessible pages:** a material number of vendor documentation sites timed out or blocked automated fetching during this pass, including SailPoint's agent-identity documentation, OneTrust's community docs, Descope's marketing pages, and the documentation sites for Noma, Pillar, Token Security and Veza. Where a documentation page could not be opened, the entry rests on pages that *were* opened and the gap is recorded in `limitations`. **No entry cites a page that was not actually retrieved.**
- **Point in time:** this is a single-day snapshot of a market that is renaming, merging and repositioning monthly. Six acquisitions or rebrands were caught mid-flight during this pass alone (§5).
- **Not exhaustive.** This directory does not claim to have found every company. Absence is not a negative assessment.

---

## 3. Counts by primary category

| ID | Label | Entries | Notes |
|---|---|---:|---|
| identity-access | Agent identity & access | 19 | Densest category. Established IAM vendors and NHI specialists both shipping named agent products |
| ai-risk | AI risk & compliance management | 16 | Crowded and heavily European; weakest documentation quality of any category |
| agent-discovery | Agent discovery & inventory | 16 | Fragmented by *detection mechanism*, not by feature (§7) |
| services | Advisory & assurance services | 16 | Kept strictly separate from software, per brief |
| evaluation | Evaluation & testing | 15 | Strongest open-source representation |
| agent-security | Agent security & threat detection | 14 | Hyperscaler guardrails plus a dense Israeli startup cluster |
| runtime-controls | Runtime authorization & controls | 13 | MCP gateways are the fastest-moving subsegment |
| observability | Observability & traceability | 13 | Mostly developer tools; only three meet a governance bar (§7) |
| model-governance | Model lifecycle & governance | 12 | The most mature category, and the one least changed by agents |
| data-governance | Data governance & privacy | 11 | DSPM-for-AI plus retrieval-permission enforcement |
| agent-building | Agent building & orchestration | 11 | Governance features documented selectively; see `not_found` claims |
| **work-delegation** | **Work discovery & human delegation** | **4** | **Genuine white space. See §6** |
| | **Total** | **160** | |

Secondary categories are widely used, which is the clearest signal that these layers are not clean market boundaries: observability (37), AI risk (35), runtime controls (35), agent discovery (26) and evaluation (26) each appear as a secondary tag on more than a sixth of the directory.

**Product type:** 96 commercial, 25 open source, 23 hybrid (open core with a paid cloud), 16 service.
**Availability:** 149 generally available, 4 preview, 1 announced, 6 unknown. `unknown` means no fetched page stated a status — it is not a guess.

### Note on entry count versus the 75–150 target

The evidence supported **160** entries, ten above the stated ceiling. Nothing was padded to reach that number, and I did not want to bin verified research on my own authority. If you want to land at 150, the defensible first cut is the ten entries that have *both* no documentation-grade source *and* an unconfirmed or preview availability status: **Aembit** (resolved during merge — it does have documentation), **Entro Security**, **SailPoint Agent Identity Security**, **Token Security**, **Veza AI Agent Security**, **Nudge Security AI Agent Discovery**, **Holistic AI Governance Platform**, **Lumenova AI Platform**, **Obsidian Security Shadow AI**, **Enzai**. Four of those are large, credible vendors whose documentation simply sits behind a login or timed out for us, so a re-fetch is a better move than a deletion.

---

## 4. Regions covered

Geography values were recorded only where a fetched page supported them, so these counts are conservative and many entries carry only `global`.

| Region | Entries tagged |
|---|---:|
| US | 81 |
| global (no single HQ evidenced) | 111 |
| EU (unspecified member state) | 25 |
| Israel | 12 |
| UK | 7 |
| Canada | 4 |
| Germany | 4 |
| India | 4 |
| Singapore | 3 |
| Netherlands | 2 |
| Australia | 2 |
| Japan | 2 |
| Denmark, France, Spain, Sweden, Switzerland, Norway, Romania, Indonesia | 1 each |

**Honest read:** this is a US-and-Israel-centred directory with a real European tail concentrated in AI risk and compliance (Germany, Netherlands, Finland, France, Denmark, Switzerland). Japan, Korea, China, Latin America, Africa and the Middle East outside Israel are effectively unrepresented. Some of that reflects the market; some of it reflects English-only searching. Do not present the regional distribution as a market map.

---

## 5. Duplicate, rename and acquisition resolutions

Ten records were merged where two category passes independently found the same product. In each case the primary category was assigned to the product's evidenced core function and the other layer became a secondary tag; the merge rationale is recorded in each entry's `editorialNotes` and the discarded record is listed in `candidates-to-review.json` so it is not re-researched.

| Product | Also found in | Primary kept | Why |
|---|---|---|---|
| Microsoft Entra Agent ID | agent-discovery | identity-access | Evidenced artifact is an agent identity object |
| Databricks Unity Gateway | agent-building | runtime-controls | Evidenced function is mediating model/tool traffic |
| UiPath Maestro, Camunda | work-delegation | agent-building | Delegation is a process-design construct, not a governed duty assignment |
| Mindgard | agent-security | evaluation | Automated adversarial testing, not runtime blocking |
| agentgateway, NeMo Guardrails | open-source pass | runtime-controls | Enforcement point is the core function |
| garak, PyRIT, Inspect AI | open-source pass | evaluation | Test execution is the core function |

**Renames, acquisitions and parentage caught in this pass:**

- **CyberArk Secure AI Agents → Idira**, now at Palo Alto Networks. The old CyberArk URL redirects. One entry, `formerNames: ["CyberArk Secure AI Agents"]`.
- **Lakera Guard → Check Point AI Agent Security.** `docs.lakera.ai` now carries Check Point branding. One entry, not two.
- **SplxAI → SPLX, acquired by Zscaler.**
- **MCP-Scan → Snyk Agent Scan.**
- **Fairly AI + anch.AI + AI Sustainability Center → Asenion.** Recorded as a `conflict`: `asenion.ai` presents the merged company while `fairly.ai` remains live under the old brand.
- **Collibra AI Governance → Collibra AI Command Center.**
- **Vertex AI Agent Engine → Gemini Enterprise Agent Platform.** Google's naming is in active flux; a model-registry page fetched during the risk pass surfaced the new platform name, which is why Vertex AI Model Registry was held rather than published.
- **Mosaic AI Gateway → Databricks Unity Gateway**; **Azure AI Foundry Agent Service → Microsoft Foundry Agent Service**; **LangGraph Platform → LangSmith Deployment**; **Purview AI Hub → DSPM for AI**; **Datadog LLM Observability → Agent Observability**; **Yields Chiron → Yields MRM**; **Azure jailbreak risk detection → Prompt Shields**.
- **Astrix Security** is published as an identity entry but was independently flagged in the discovery pass as Cisco-acquired with standalone sales ending 2026-06-30. **Verify current commercial availability before publication.**
- **Natoma** was held rather than published because Snowflake announced an intent to acquire it, and because its evidenced function is an MCP gateway rather than agent identity.

**Suite-to-product resolutions.** Okta and Auth0 are kept separate despite shared parentage because the buyers differ (workforce identity admin versus application developer). SailPoint's agent-identity and machine-identity pages were merged into one entry with claims cited separately. SageMaker Model Registry and Model Cards were merged because AWS documents them as one governance pair. CrewAI's open-source project and its commercial platform are one hybrid entry, as are Giskard, Orkes Conductor and ClearML. DeepEval (library) and Confident AI (hosted platform) are kept separate because the buyer differs. MLflow is kept as an upstream entry even though Domino's registry is built on it.

---

## 6. Category findings, including where the taxonomy needs to change

### The taxonomy holds up, with three recommended changes

**Recommendation 1 — keep `work-delegation`, but label it honestly as emerging.** Only four products qualified, and only one (**Velatir**, an early-stage Danish company) is purpose-built as a human approval and delegation layer. **Planview Agent Resource Management** is press-release-only and carries `availability: "announced"`. **Verint Agent Factory** is CX orchestration extended into the agent era. **DutyGraph** is itself a preview-stage advisor pilot. Meanwhile no verified product performs *work and duty discovery* — establishing what work exists and who owns it — as a governed precursor to agent delegation. Process- and task-mining vendors do the discovery half with no agent-delegation artifact; HR systems of record hold duty data but are not governance products and were held with that reason. This is the clearest white space in the landscape, and it is also the category DutyGraph occupies, which is a reason to describe it with more restraint rather than less.

**Recommendation 2 — split `agent-discovery` by detection mechanism, or at minimum expose the mechanism as a facet.** "Shadow AI discovery" describes at least five unrelated technical products, and a buyer who picks by category label will buy the wrong one:

| Mechanism | What is actually detected | Examples in this package |
|---|---|---|
| Browser / endpoint telemetry | Employee use of AI web apps, including prompt payloads | Harmonic Security, CrowdStrike AIDR collectors |
| SaaS and OAuth API scanning | OAuth grants, API keys, service accounts, platform-native agents | Valence, AppOmni Agent Inventory, Nudge Security, Obsidian |
| Code and SDLC scanning | AI libraries, models and MCP servers in repositories; AI-BOM | Checkmarx, Cycode, SPLX, Cisco AI Defense AI BOM |
| Network / SASE inspection | LLM API traffic and AI destinations | Netskope AI Command Center, Palo Alto AI Access Security |
| Registration, not detection | Agents that were deliberately registered | Entra Agent ID, Microsoft Agent 365, Google Agent Registry, Boomi Agent Control Tower, Workday ASOR |

That last row is the important one. A registry finds nothing it was not told about. Microsoft's own shadow-agent *detection* (via Defender for Endpoint) is preview, while the Agent 365 registry is GA — the distinction is preserved in the claims and should survive into publication copy. Per the brief: **"rogue agent" has no consistent technical definition across these vendors**, and each entry records the vendor's own scope rather than a normalized one.

**Recommendation 3 — add a facet, not a category, for "governance-grade record".** In `observability`, only three of thirteen products document the properties a governance buyer actually needs — audit logs, RBAC, retention and masking: **Langfuse**, **LangWatch** and **Datadog** (the last only via navigation labels rather than a fetched control page). Weights & Biases documents RBAC, SSO and SCIM but no audit log; Braintrust documents a customer-controlled data plane. The other eight are excellent developer debugging tools with no immutable record, retention policy or policy gate, and every one of them says so in its `limitations`. A directory that lists all thirteen under one label will mislead a risk buyer. The same facet applies to `agent-building`, where audit logging, tenant isolation and per-agent permission scoping came back `not_found` for LangGraph, Microsoft Foundry Agent Service, Gemini Enterprise Agent Platform, Bedrock AgentCore, n8n and Dify. Documented human-in-the-loop approval exists for only four: LangChain interrupt middleware, Temporal signals, CrewAI task review, and Orkes human approval as a composition element.

### Other category notes

- **`identity-access` is the most mature agent-governance category**, and the only one where large incumbents (Microsoft, Okta/Auth0, SailPoint, CyberArk-via-Idira, Veza, Britive, Akeyless, 1Password, Teleport) and specialists (Astrix, Entro, Oasis, Token Security, Descope, Aembit, GitGuardian) both ship named, agent-specific products. Open source is thin — **SPIRE** is the only verified project.
- **`ai-risk` has the weakest documentation of any category.** Trustible, trail, Naaia, Enzai, Lumenova, Yields, ModelOp, Holistic AI and GRACE publish no technical documentation at all, so their claims are `vendor_claim` only. There is **no independent verification anywhere in this category** of control-library quality, discovery accuracy or framework-mapping correctness. No entry asserts that a framework mapping proves control effectiveness, or that any product establishes EU AI Act, ISO/IEC 42001 or SOC 2 compliance — that phrasing was enforced deliberately.
- **`runtime-controls` is where the market is moving fastest.** MCP gateways went from a niche to a dozen credible products; availability nuance is preserved (Model Armor's agent-gateway integration is preview while its MCP and Gemini integrations are GA; NeMo Guardrails' repository calls itself beta and not production-ready while NVIDIA's developer guide presents it as available; Databricks Unity Gateway availability is `unknown`).
- **Human approval as a standalone product barely exists.** Only Velatir sells it directly. Everything else is an SDK primitive or a feature inside a larger platform.
- **`services` accreditation was held to a hard line.** Only **BSI** evidenced named accreditation (UKAS, RvA, ANAB) and only *for ISO/IEC 42001 certification*; BSI itself states it is merely "undergoing evaluation" for EU AI Act notified-body designation, which is recorded as such. TÜV SÜD and DNV name no accrediting body, so no accreditation claim was made for them. **No firm anywhere evidenced EU AI Act notified-body status** — that is recorded as a category-wide exclusion. BABL AI's auditor credential and the IAPP AIGP, ISACA AAIA and JDLA schemes show no external accreditation.

---

## 7. Market overlaps worth flagging to buyers

1. **Identity versus runtime.** Issuing an agent identity (identity-access) and deciding whether a specific tool call is allowed (runtime-controls) are sold as one story and are frequently two purchases. 13 entries carry identity-access as a secondary and 35 carry runtime-controls.
2. **Discovery versus inventory versus registry.** See §6, Recommendation 2. The buyer question that separates them is "what does this find that I did not already tell it about?"
3. **Guardrails are converging on the hyperscalers.** Bedrock Guardrails, Azure Prompt Shields and Google Model Armor are platform features; Check Point/Lakera, Noma, Pillar, NeuralTrust, Straiker and Operant sell across platforms. The buyer question is portability, not detection quality — and none of the detection-quality claims in this package are independently verified.
4. **Evaluation versus red teaming versus observability.** The same vendors appear in all three (Mindgard, Promptfoo, Braintrust, Arize, Langfuse). The separator is whether the product *executes tests* or *records production behaviour*. Products that do neither well were held.
5. **AI risk versus model governance.** Model governance is a decade-old discipline (SR 11-7 model risk management) with real documentation; AI risk is a three-year-old discipline with better marketing. Buyers in regulated financial services often need both, from different vendors.
6. **DSPM-for-AI versus retrieval permissions.** Finding sensitive data (Purview, Cyera, BigID) and enforcing document-level ACLs at retrieval time (Knostic, Securiti, Immuta) are different problems with different failure modes.

---

## 8. Ambiguous claims, conflicts and marketing-only support

**Twelve entries carry preserved conflicting evidence** rather than a resolved single answer: 1Password (product named two ways on one page), Asenion (two live brands post-acquisition), Britive ARC (page metadata date conflicts with in-text launch date), Cycode (early access versus launch announcement), **Daytona (marketing site active while the public repository declares itself unmaintained since June 2026)**, DNV ("eight key topics" enumerated as seven), garak (docs point at a legacy repository path), NannyML (version mismatch between repo and docs), NeMo Guardrails (beta versus available), Patronus AI (docs describe evaluation while marketing foregrounds simulation and world models), Ragas (repository ownership moved organizations), Securiti (an "Agent Commander" offering promoted with no product or documentation page to establish availability).

**Eight `not_found` claims** are recorded, all of them about governance controls in agent-building platforms plus DutyGraph's own production adoption. `not_found` means we did not find support — not that the capability is absent.

**The 38 marketing-only entries** (no `documented` or `independently_supported` claim) are: 1Password AI Agent Identity Kit, Akeyless SecretlessAI, BigID AI Security & Governance, Britive ARC, Cyera AI Guardian, Deloitte Algorithm Assurance, Deloitte Trustworthy AI, Entro Security, Enzai, EY Responsible AI services, GRACE Governance, Holistic AI AI Audits, Holistic AI Governance Platform, Knostic, KPMG AI Trust services, Lumenova AI Platform, ModelOp Center, Naaia, Netskope One AI Command Center, NeuralTrust (TrustGate), Noma Security Platform, Nudge Security AI Agent Discovery, Oasis Agentic Access Management, Obsidian Security Shadow AI, OneTrust AI Governance, Operant Semantic Firewall, ORCAA Algorithmic Audit, Pillar Security, PwC Responsible AI Toolkit, SailPoint Agent Identity Security, Securiti Gencore AI, Straiker Defend AI, Token Security, trail, Trustible, Valence SaaS and AI Discovery, Veza AI Agent Security, Yields MRM. For services, marketing-page evidence is arguably appropriate — a consulting practice has no API reference. For the software vendors in that list it is a gap worth closing before publication.

### DutyGraph, held to the same standard

DutyGraph is published as the directory's own entry, clearly labelled as publisher, with `availability: "preview"` and `productType: "commercial"`. Its capability claims are `vendor_claim` because the only sources located are its own marketing pages; no documentation, API reference, changelog or trust centre exists. Its `production-adoption` claim is `not_found` — the site states it is recruiting its first pilot companies and that results and turnaround times are still being tested. One claim *is* `documented`, and it is the useful one: the site explicitly separates what ships from what does not, stating that requests, versioned manifest drafts and a connected sample are available now while **live IAM provisioning, signed attestations and automatic revocation are integration work and not active features of the pilot.** Governance views are shown against a fictional sample company.

Two editorial cautions follow. First, the landing page names Workday, Oracle HCM, Okta, Entra ID and Saviynt as sample records; **no integration should be inferred from that**, and `integrations` is deliberately empty. Second, the existing live directory's maintenance note references "Telarus supplier status", which implies a channel relationship worth clarifying before any partner-adjacent language is published. Nothing in this package describes DutyGraph as a leader, a category-definer, unique, or production-proven, because no evidence supports those words.

**Generator impact.** The live directory currently uses a four-label vocabulary (RUNTIME ACCESS, AI RISK & OVERSIGHT, IDENTITY & ACCESS, WORK DISCOVERY) across 9 organizations. This package uses the twelve-ID taxonomy. **The website generator's category definitions must be updated before import, and every entry needs editorial review before publication.** Also note that **Saviynt appears in the live directory but was held in this pass** — its agent-specific evidence was found only in blog posts and a gated brief, not on a product or documentation page. That is a discrepancy to resolve deliberately, in one direction or the other.

---

## 9. Missing coverage and next research priorities

**Known gaps in this pass:**

| Gap | Detail |
|---|---|
| Work/duty discovery | No verified product does work discovery as a governed precursor to delegation. Re-test whether process-mining vendors have shipped agent-delegation artifacts since. |
| Consent for AI training data | No vendor met the documentation bar. OneTrust, Didomi, Usercentrics and Ketch were all held. |
| Japan, Korea, China, LatAm, Africa | Effectively unsearched in local languages. Highest-value expansion for a genuinely global directory. |
| Canada, Australia | Almost nothing agent-specific surfaced; likely a search artifact rather than a market fact. |
| Open source in identity | Only SPIRE verified. Infisical and others left for a second pass. |
| Not researched at all | Snowflake Horizon, Google Cloud Sensitive Data Protection, LlamaIndex, Salesforce Agentforce, ServiceNow AI Agent Orchestrator, Inngest, Restate, DBOS. |
| Blocked or unfetchable | SailPoint agent-identity docs, OneTrust community docs, Descope marketing, Noma/Pillar/Token/Veza docs, Opsin (robots-disallowed), IBM watsonx Orchestrate docs, HoneyHive security page, Arize security-and-compliance (404), n8n log-streaming docs (404). |

**Priorities for the next pass, in order:**

1. **Re-fetch the blocked documentation** for the ten large vendors whose entries currently rest on marketing alone. This is the single highest-value action: it converts credible entries from `vendor_claim` to `documented` without new discovery.
2. **Resolve the three live-status questions** before publication: Astrix commercial availability post-Cisco, Daytona maintenance status, Saviynt's inclusion versus this pass's hold.
3. **Non-English discovery pass**, prioritising Japanese and German-language vendor material.
4. **Promote the strongest held candidates** with one additional fetched source each: CrowdStrike AIDR product pages, Root Signals (FI), LatticeFlow AI, Okareo, Vals AI, Relevance AI (AU), Kore.ai (IN), Cognigy (DE), Beam AI (DE), Repello and Enkrypt (IN), ChillStack (JP).
5. **Build the mechanism facet** for agent-discovery and the governance-grade facet for observability, then re-tag existing entries.
6. **Establish a re-verification cadence.** Six renames or acquisitions were caught in a single day's research. A quarterly review is the minimum this market tolerates, and entry-level `reviewed` dates already support staggered re-checking.

---

## 10. Search themes, buyer intent, and directory page angles

**These keyword ideas are hypotheses.** No search-volume data was available to this research pass, so no volume, difficulty, ranking or traffic figure appears here. Treat the intent column as a reasoned inference from vendor page structure and the way the categories overlap, and validate against real keyword data before making publishing decisions. Nothing here guarantees traffic.

| Search theme | Likely buyer intent | Useful directory/category angle |
|---|---|---|
| "AI governance platform" | Early, broad orientation; often a risk or compliance lead told to "get a handle on AI" | The landing hub. Lead with the twelve-layer split and the point that AI governance is several distinct jobs |
| "agent governance" / "agentic AI governance" | Newer, more technical; often security or platform engineering | A page that separates identity, runtime control and discovery, because vendors blur all three |
| "shadow AI discovery" / "shadow agents" | Active problem, urgent, usually security | The mechanism comparison table from §6. Highest-value page in the package because the category label actively misleads |
| "agent identity" / "non-human identity" | Named budget, IAM owner, shortlist stage | Compare on identity lifecycle: issuance, delegation semantics, access review, revocation |
| "MCP gateway" / "MCP security" | Very current, engineer-led, evaluation stage | Compare on enforcement point and policy model; note what is preview |
| "EU AI Act compliance software" | Deadline-driven, legal or compliance | Be explicit that no product establishes compliance and no vendor is a notified body |
| "ISO 42001 certification" | Procurement of a certification body, not software | The services category, with accreditation scope quoted narrowly |
| "AI red teaming" / "prompt injection defense" | Security testing budget | Separate test-execution products from runtime-blocking products |
| "agent observability" / "agent audit trail" | Split intent: developers debugging versus risk teams needing records | The governance-grade facet from §6, Recommendation 3 |
| "model risk management" / "model registry" | Mature, regulated, often financial services | Position against AI risk platforms rather than alongside them |
| "AI data leakage prevention" / "RAG permissions" | Data security owner, post-incident or pre-rollout | Separate sensitive-data discovery from retrieval-time ACL enforcement |
| "human in the loop approval" | Emerging, often no budget line yet | Honest page: this is barely a product category yet, and say so |
| "human-to-agent delegation" / "duty mapping" | Almost no commercial search intent yet; conceptual | Thought-leadership rather than a comparison page; the category has four entries |

**Comparisons worth building, each grounded in a documented difference rather than a "best tool" ranking:**

- Registry versus detection in agent discovery — *does it find agents nobody registered?*
- Portable guardrails versus platform-native guardrails — Check Point/Lakera, Noma, Pillar, NeuralTrust versus Bedrock Guardrails, Prompt Shields, Model Armor.
- Open-source evaluation harnesses versus hosted eval platforms — Promptfoo, garak, PyRIT, Inspect AI, DeepEval, Ragas versus Braintrust, Patronus, Confident AI, Maxim, Coval.
- Observability tools that document audit logs, RBAC and retention versus those that do not.
- Agent platforms with documented human-approval primitives (LangChain, Temporal, CrewAI, Orkes) versus those where approval gating came back `not_found`.
- Model governance for regulated model risk (ModelOp, ValidMind, Yields, Deeploy) versus AI-programme governance (Credo AI, Holistic AI, OneTrust, IBM watsonx.governance).
- Certification bodies with named accreditation for ISO/IEC 42001 versus those without.

---

## 11. Handoff summary

- **160 verified entries** across all twelve categories, each with a companion evidence record joined by exact name, 452 claims and 346 sources. **166 candidates held or explicitly excluded**, with reasons, so the same ground is not re-covered.
- **All four JSON files parse.** Names and IDs are unique, every category ID resolves, every category label is machine-derived from its ID, every claim `sourceId` resolves inside its own record, and every date is a real ISO date with `null` used for unknowns. The validator reports zero errors.
- **Count is ten above the 150 ceiling.** Nothing was padded; §3 gives a ranked ten-entry cut list if you want to land exactly at 150.
- **Coverage is uneven by design of the market, not by choice.** `identity-access` (19) is mature; `work-delegation` (4) is genuine white space and the honest finding of this research.
- **Most important limitations:** 38 entries rest on marketing pages only; 65% of entries have a documentation or repository source; a material number of vendor documentation sites were unreachable during this pass and are named rather than glossed; searching was English-only; and *verified* means checked against sources, never independently tested.
- **Before publication:** update the generator's category definitions from four labels to twelve; resolve Astrix, Daytona and Saviynt; re-fetch the ten blocked documentation sets; and review DutyGraph's own entry to confirm you are comfortable with how restrained it is.
