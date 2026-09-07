# Governance and integrations

## Authority begins with a human

The intended chain is person → role/duty → task → required systems/scopes → proposed agent → authorized review → bounded issuance and enforcement.

An employee asks for help with a task. A rule-aware system assembles a proposed manifest from work context, effective entitlements, applicable policy, and limits. A responsible reviewer (the notary role in the product concept) approves or trims it. The intended agent authority cannot exceed the person's effective authority, and can be narrower.

Task approval, manager ownership, permission, attestation, credential issuance, and runtime enforcement are different facts. Never collapse them into a single green “approved” badge.

## System responsibilities

| System family | Intended source |
| --- | --- |
| Okta / Entra | Identity and related directory context |
| Workday / Oracle people systems | Employment, job, reporting information |
| Saviynt / comparable IGA | Entitlements, access policies, separation-of-duties context |
| Document/policy sources | Applicable SOPs and operating rules with provenance |
| DutyGraph | Duties, tasks, evidence, work relationships, proposed delegation |
| Signet concept | Review/attestation and bounded delegation layer |

A policy document should be attributed to its actual source; do not assume every SOP is stored in an IGA platform.

## Today versus intended execution

Real provider integrations exist for research, AI drafts/transcription, invitation email, and optional Neo4j projection. Configuration is account-specific and availability is not proof of a successful request. See [integration reference](../INTEGRATIONS.md).

The authority demo models vendor-shaped fixture inputs and a proposed manifest workflow. It does not prove live HR/IGA synchronization, provisioning an Okta identity, writing a Saviynt policy, managed cryptographic signing, or enforced runtime revocation. See [authority demo](../agent-authority-demo.md).

Before real issuance, resolve identity matching, entitlement freshness, scope intersection, separation-of-duties checks, authorized reviewer identity, exact-action policy, signing/key custody, revocation, audit receipts, and retry/idempotency behavior. Unknown authority must fail closed.

## Auditor and control exploration

Useful questions include: which agents touch a control-related task, which human owns them, what software is involved, and where is the supporting record? Graph paths support investigation.

Control scenario labels are local mappings, not an audit opinion or proof of effective controls. Avoid presenting a SOC 2 filter as compliance certification.

## Commercial hosting direction

The product should provide a coherent managed service rather than require every customer to become a database operator. Current Aura connection settings are useful pilot infrastructure. A managed multi-tenant graph service, isolation model, billing, and enterprise bring-your-own infrastructure options need a deliberate architecture/commercial decision before scale.
