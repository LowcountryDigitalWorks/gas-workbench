# G.A.S. Workbench Architecture

Status: bootstrap candidate under `WB-BOOT-001`.

## Purpose

G.A.S. Workbench is the product/application layer over the accepted G.A.S. semantic engine. It exists so product UX can evolve continuously without coupling every presentation change to engine release semantics.

## Repository split

### `gas-engine`

Owns semantic correctness:
- normalized evidence and provenance;
- source/missingness semantics;
- compatibility and comparability;
- search/AI visibility analysis;
- attention inputs and deterministic projections;
- human decision/recommendation lifecycle;
- baseline/follow-up measurement and outcomes;
- bounded claim/interpretation ceilings.

### `gas-workbench`

Owns product experience:
- application shell and navigation;
- design tokens/components/patterns;
- module-level information architecture;
- responsive and accessible interaction;
- presentation-only workflow/gate state;
- human-controlled report composition UX;
- versioned consumption of accepted engine projections.

Workbench does not become another semantic engine.

## Modular-monolith rule

The initial product remains one application repository and one deployable frontend boundary.

Candidate feature directories:

```text
src/modules/
  home/
  discover/
  visibility/
  technical/
  evidence/
  attention/
  decisions/
  measurement/
  reports/
```

A directory is not created merely to advertise a future feature. Add a module when it has implemented product behavior.

Promote a module to a package only after a real second consumer or independent versioning need exists. Promote a package to another repository only when runtime, security, deployment, or ownership lifecycle materially diverges.

## Engine boundary

The first milestone uses deterministic synthetic/public-safe projection fixtures. `WB-ENGINE-001` will select the smallest stable long-term seam among checked JSON projections, generated types/schema artifacts, a deliberate engine client/projection package surface, or later runtime transport.

Rules regardless of transport:
- source version is explicit;
- unsupported/mismatched versions fail visibly;
- UI derives presentation state from supplied fields only;
- provider SDKs do not leak into feature modules;
- no silent coercion of missing/unavailable/zero or incompatible cohorts;
- no UI-authored semantic IDs, scores, causality, priority, or business value.

## Product and design system

Shared primitives live under `src/design-system`. Feature modules should compose shared primitives rather than fork colors, spacing, statuses, tables, drawers, or workflow patterns.

Initial LDW Tidal brand foundation:
- Estuary Navy `#102A3A`
- Cypress Teal `#2F766F`
- Warm Oyster `#F3EFE6`
- Soft White `#F7F8F6`

The product should optimize for time-to-confident-no-action and time-to-exact-action. Healthy/no-action states stay quiet. Evidence detail is progressively disclosed.

## Runtime boundary

The bootstrap adds no backend, database, auth system, provider connector, scheduler, queue, runtime AI, customer portal, or production deployment.

A future `gas-runtime`/`gas-connectors` boundary is justified only when G.A.S. itself must own materially different network/OAuth/credential/scheduling/security lifecycle. Do not create it speculatively.

## Security and data

Synthetic/public-safe data only in the foundation milestone. Secrets and customer/regulated data must never be committed. Repository settings and production/security changes remain separately gated.
