# Workbench ↔ G.A.S. Engine Boundary

Status: first-milestone boundary for `WB-ENGINE-001`.

## Selected initial seam

Workbench initially consumes **checked, versioned JSON projections** shaped from accepted `gas-engine` operator-workspace output.

The current boundary is:

- Workbench projection schema: `ldw.gas-workbench-projection.v1`, minor `0`;
- accepted source artifact: `gas-engine` `operator-workspace`;
- accepted source artifact version: `0.17.0`;
- strict decoder: `parseWorkbenchProjection(...)`;
- synthetic/public-safe fixtures only.

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

## Fixtures

Three checked fixtures support the first operator-product walkthroughs:

- `quiet.json` — adequately evidenced, no Attention item; absence of Attention is not a universal health score;
- `limited.json` — partial/unavailable sources and a not-comparable state remain visibly distinct from observed zero;
- `human-review.json` — an unranked Attention item is selected for human investigation, while recommendation, measurement, and outcome state remain explicitly absent.

All fixture identities, domains, and evidence are synthetic/public-safe.

## Failure behavior

The decoder fails visibly when:

- the Workbench projection schema/minor is unsupported;
- the source engine operator-workspace version is unsupported;
- required fields are missing;
- unknown fields silently widen a reviewed object;
- readiness or lifecycle values fall outside the reviewed vocabulary.

There is no best-effort version coercion.

## Future live transport

A later accepted runtime may supply the same projection through a generated artifact, package client, or HTTP/API transport. Feature modules should depend on the decoded Workbench projection rather than provider SDKs or raw `gas-engine` internals, so transport can evolve without moving semantic authority into the UI.

Do not create `gas-runtime` or `gas-connectors` merely to replace these fixtures. A separate runtime boundary requires a real network/OAuth/credential/scheduling/security lifecycle need and its own accepted authority.
