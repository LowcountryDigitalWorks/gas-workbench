# Workbench ↔ G.A.S. Engine Boundary

Status: first-milestone boundary for `WB-ENGINE-001`.

## Selected initial seam

Workbench initially consumes **checked, versioned JSON projections** shaped from accepted `gas-engine` operator-workspace output.

The current boundary is:

- Workbench projection schema: `ldw.gas-workbench-projection.v1`, minor `0`;
- accepted source artifact: `gas-engine` `operator-workspace`;
- accepted source artifact version: `0.17.0`;
- structural parser: `parseWorkbenchProjection(...)`;
- **canonical product decoder: `decodeWorkbenchProjection(...)`**;
- synthetic/public-safe fixtures only.

`parseWorkbenchProjection(...)` validates the reviewed JSON shape and vocabularies. Product code should use `decodeWorkbenchProjection(...)`, which additionally verifies relationships that Release 0.17 computes from one authoritative workspace: counts, Attention/evidence identity, manifest/readiness agreement, navigation decision state, unique IDs, and selected-Attention referential integrity.

This is deliberately lower coupling than importing `gas-engine` as a runtime package and does not require a backend, provider connection, OAuth, database, or network transport.

## Semantic ownership

`gas-engine` remains authoritative for:

- evidence meaning and identity;
- source readiness and missingness;
- compatibility/comparability;
- Attention semantics;
- human decision/recommendation lifecycle;
- measurement/outcome semantics;
- claim ceilings and limitations.

Workbench may present only explicit supplied projection fields. It must not reinterpret missing data as zero, turn Attention into priority, promote a human investigation into a recommendation, or infer business impact/causality.

The integrity checks in this repository are not a second semantic engine. They only reject contradictions among fields whose relationships are directly computable from the accepted Release 0.17 projection itself.

## Mapping lineage

The projection preserves reviewed Release 0.17 fields or strict subsets of them:

| Workbench projection | Accepted engine source |
| --- | --- |
| `source.workspaceId` | `OperatorWorkspace.id` |
| `workspace.scope` / `trustedTarget` | `OperatorWorkspace.scope` / `trustedTarget` |
| `readiness` | `OperatorWorkspace.readiness` |
| `sourceManifest` | `OperatorWorkspace.sourceManifest` (publication-safe subset) |
| `evidenceRows` | `OperatorWorkspace.evidenceRows` |
| `attention` | `OperatorWorkspace.attention` |
| `decisionCycle` | strict subset of `OperatorWorkspace.decisionCycle` |
| `timeline` | `OperatorWorkspace.timeline` |
| `navigation` | `OperatorWorkspace.navigation` |
| `authorityNotes` / `limitations` | same-named Release 0.17 fields |

The source-manifest projection intentionally omits fields the first Workbench slice does not need. Omission is not reinterpretation: the source artifact remains authoritative and later projection revisions must explicitly review any expanded field set.

### Release 0.17 source rules used by the fixtures

The first fixture set was reconciled against accepted `gas-engine` main `93113d54f0f212adc447d1c9aff722a6911c1422`, especially:

- `src/operator/service-brief.ts` — seven fixed readiness modules, `not_supplied` behavior, manifest construction, Attention generation, one-based Attention navigation order;
- `src/operator/decision-cycle.ts` — decision-cycle readiness state derivation;
- `src/operator/workspace.ts` — evidence-row projection, navigation summaries, timeline, authority notes and workspace limitations.

These checked fixtures are **public-safe projection exemplars**, not claims that their synthetic IDs or prose were emitted by a live engine run. Their state combinations and cross-field relationships must nevertheless be possible under the accepted Release 0.17 source rules. CI plus adversarial tests reject known impossible or contradictory combinations. A future engine-owned projection generator may replace hand-maintained fixture shaping without changing the Workbench consumer contract.

## Fixtures

Three checked fixtures support the first operator-product walkthroughs:

- `quiet.json` — accepted modules are either `ready` or `not_supplied`, no Attention item exists, and absence of Attention is not a universal health score;
- `limited.json` — Search Analytics is explicitly `limited` while absent AI visibility remains `not_supplied`; neither state becomes observed zero or a fabricated Attention item;
- `human-review.json` — an accepted Page Focus candidate produces one one-based unranked Attention item and matching evidence row; an `investigate` decision with no measurement plan correctly remains `measurement_not_planned`, with no recommendation, measurement or outcome implied.

All fixture identities, domains, and evidence are synthetic/public-safe.

## Failure behavior

The canonical decoder fails visibly when:

- the Workbench projection schema/minor is unsupported;
- the source engine operator-workspace version is unsupported;
- required fields are missing;
- unknown fields silently widen a reviewed object;
- readiness or lifecycle values fall outside the reviewed vocabulary;
- readiness/source-manifest state contradicts itself;
- duplicate IDs or dangling Attention selections exist;
- Attention and evidence rows disagree;
- navigation counts disagree with projected arrays;
- decision-cycle navigation disagrees with supplied dossier state.

There is no best-effort version coercion.

## Future live transport

A later accepted runtime may supply the same projection through a generated artifact, package client, or HTTP/API transport. Feature modules should depend on the decoded Workbench projection rather than provider SDKs or raw `gas-engine` internals, so transport can evolve without moving semantic authority into the UI.

The preferred future hardening path is an **engine-owned deterministic projection exporter** (or generated schema/type artifact) so checked Workbench fixtures can be reproduced directly from accepted synthetic engine workspaces. That is not required to make the first product UI depend on a backend.

Do not create `gas-runtime` or `gas-connectors` merely to replace these fixtures. A separate runtime boundary requires a real network/OAuth/credential/scheduling/security lifecycle need and its own accepted authority.
