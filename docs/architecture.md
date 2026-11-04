# G.A.S. Workbench Architecture

**Status:** Accepted synthetic/public-safe modular-monolith operator surface through [PR #39](https://github.com/LowcountryDigitalWorks/gas-workbench/pull/39). Live GitHub, source and current issue/PR state override this historical summary. The app is not a deployed provider-connected or customer-authorized service.

## Purpose and repository boundary

Workbench is the operator interaction layer for accepted G.A.S. intelligence. It presents evidence and limits clearly, supports deliberate human review/decisions and bounded reporting, and avoids a dense generic admin dashboard.

- **`gas-engine` is authoritative:** evidence meaning, provenance, source readiness, missingness, comparison/comparability, Attention, human recommendation/decision lifecycle, measurement/outcomes and allowed claim ceilings. Accepted semantic baseline: Release 0.24.
- **`gas-workbench` is presentation authority:** command-center shell, module navigation, interaction, focus/accessibility/reflow, local draft experience and strict presentation of checked supplied projections.
- **Provider tools and WQT remain upstream:** no direct provider queries, crawler/technical audit clone, rank/keyword collection, generic content generation or provider SDK in feature components.

The accepted UI does not supply authenticated ingestion, tenant authorization, live storage, hosted deployment or customer account integration. Synthetic/public-safe fixtures are not real provider/customer evidence.

## Accepted source layout

| Area | Responsibility |
| --- | --- |
| `src/app/` | Shell, module registry, scenario selection, feature-load identity/coherence and error states |
| `src/design-system/` | Tidal tokens, accessible reusable primitives and formatting |
| `src/modules/` | Implemented feature components and tests |
| `src/engine/` | Versioned checked shell/feature projections, referential integrity and synthetic fixtures |

Modules stay as feature directories in this one repository. Extract a package only for a proven second consumer or independent release need; extract a repository only for demonstrably different runtime/security ownership.

## Accepted operator journey and destinations

Registered destinations are **Home, Visibility, Technical, Evidence, Attention, Decision, Measure / Outcomes, Reports, and Sites / Portfolio**. The intended product journey is source/state inspection → unranked Attention → human decision → measurement/interpretation limits → customer-safe reporting, with internal portfolio context when relevant.

- **Visibility** keeps organic search and AI source-native universes separate, including provenance, coverage, comparability and missingness.
- **Technical** presents accepted WQT/longitudinal/discovery observations without becoming a scanner or auto-remediator.
- **Measure / Outcomes** distinguishes supplied factual measurement/readiness, accepted interpretation/claim ceilings and separately recorded human outcomes.
- **Reports** separates customer-safe preview/export from internal evidence and prohibited overclaims.
- **Sites / Portfolio** is LDW-internal and preserves tenant/site/scope isolation; it does not invent cross-customer ranking or readiness scores.
- **Discover** is a reserved ID only, not a registered destination. It requires a separately justified evidence-linked operator workflow and exact issue before activation.

## Engine projection seam

The canonical shell decoder is `decodeWorkbenchProjection(...)` in `src/engine/projection.ts`, consuming the checked `ldw.gas-workbench-projection.v1` minor-0 contract. Feature-specific projection decoders are implemented in:

- `src/engine/visibility-projection.ts`
- `src/engine/technical-projection.ts`
- `src/engine/measurement-projection.ts`
- `src/engine/report-projection.ts`
- `src/engine/portfolio-projection.ts`

Feature payloads must be checked against the accepted shell's workspace/tenant/site/scope/target and relevant evidence identity. Decoders may enforce schema/vocabulary/relationship integrity; they must not regenerate Search Analytics, AI comparison, severity, recommendation priority, measurement interpretation or claim policy from UI heuristics. The global shell contract remains unchanged unless a later separately reviewed revision explicitly changes it.

The post-Portfolio UX integrity fix, [PR #27](https://github.com/LowcountryDigitalWorks/gas-workbench/pull/27), prevents feature selectors from displaying previously selected cases' stale evidence/error state and preserves accessible status/alert behavior. Later [PR #37](https://github.com/LowcountryDigitalWorks/gas-workbench/pull/37) adds non-ranked factual Portfolio filters with atomic selection clearing. Accepted [PR #39](https://github.com/LowcountryDigitalWorks/gas-workbench/pull/39) composes explicit snapshot-bound selection with the canonical portfolio-to-workspace preflight, returning `no_explicit_selection` or `selection_expired` before inspecting a workspace. This remains an **unwired pure local helper**, not a provider, user-authorization or runtime feature.

## Interaction and safety invariants

- Never coerce `not_supplied`, `unknown`, incomplete/partial coverage or unavailable evidence into numeric zero or a healthy/no-action verdict.
- Keep human-authored drafts/outcomes separate from canonical persisted actions; a local draft is not an approval, submission, or recommendation.
- Preserve source IDs, timestamps, periods, provenance and exact evidence references through drill-down and report composition.
- Avoid blended provider metrics, universal SEO/visibility scores, automatic causal/business-value claims and silent precision.
- Maintain keyboard/focus, readable contrast, reflow and long-reference wrapping. The accepted #27 QA covered standard narrow/natively zoomed product layouts; an extra compounded ~187-CSS-pixel experiment was explicitly **not** accepted as a pass.
- Do not ingest customer/regulated/private data, credentials or provider payloads without separate authority.

## Evolution gates

The [evergreen roadmap #8](https://github.com/LowcountryDigitalWorks/gas-workbench/issues/8) is a sequence/decision authority, **not** blanket permission to create features. The planned operator module series is implemented; the next product slice should be earned by real operator friction/evidence. Engine research candidates in [gas-engine #31](https://github.com/LowcountryDigitalWorks/gas-engine/issues/31) remain separate research/design gates and do not reserve a new semantic release.

A future accepted live transport or exporter may replace synthetic fixture delivery, provided it preserves exact checked projection and security boundaries. Do **not** add a speculative `gas-runtime`, `gas-connectors`, backend, database, authentication, scheduler, provider integration or production exposure merely to make this demo seem live.

Changes to source follow repo [AGENTS.md](../AGENTS.md): a bounded issue, feature branch, deterministic check/audit, hosted CI and fresh independent exact-head review. No author self-acceptance or repository-governance change.

The historical [Source Atlas design/QA records](design/source-atlas.md) document original decisions and acceptance evidence; their contemporaneous warnings or branch states must not be interpreted as today's product state.
