# G.A.S. Workbench Agent Instructions

## Source of truth

Live GitHub/system state is authoritative. Before material work, re-read current `main`, the exact owning issue/PR, this file, and relevant architecture/docs. Live state overrides chat history, memory, handoffs, or stale candidate refs.

## Product boundary

This repository is the evergreen G.A.S. operator product. `LowcountryDigitalWorks/gas-engine` remains authoritative for evidence semantics, provenance, missingness, compatibility/comparability, analysis, human decision state, measurement/outcome semantics, and claim ceilings.

Do not duplicate or reinterpret engine semantics inside UI modules. Presentation state may be derived only from explicit accepted inputs.

## Architecture

Prefer a modular monolith:
- `src/app` — application shell/composition;
- `src/design-system` — shared tokens/components/patterns;
- `src/modules` — bounded product capabilities;
- `src/engine` — versioned Workbench ↔ engine projection/client boundary.

Do not create a package, repository, service, scheduler, database, or control plane merely for organizational symmetry. Extract only when a measured consumer/runtime/security lifecycle requires it.

Feature modules do not call SEO/provider APIs directly.

## Product principles

- Build an operator command center, not a dense generic admin dashboard.
- Use progressive disclosure.
- Make factual current state and legitimate next action clear.
- Preserve quiet no-action/healthy states.
- Surface provenance, freshness, missingness, comparability, and limitations when decision-relevant.
- Distinguish human-authored decisions/outcomes from provider/machine evidence.
- Never invent universal health scores, automatic priority, severity, business value, causality, or unsupported precision.
- Accessibility, keyboard operation, responsive behavior, and readable focus states are release requirements.

Commercial products may provide interaction/design inspiration only. Do not copy proprietary source, assets, branding, or product semantics.

## Change control

Meaningful work uses a feature branch and PR. Reconcile open/recent PRs and source movement before editing. Keep one owning issue/scope per candidate where practical.

Before PR acceptance, run the applicable deterministic suite:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
npm run check
npm audit
git diff --check
```

Inspect the complete final diff. Hosted CI and fresh independent exact-head review are required before merge unless a newer live repository rule explicitly supersedes this.

## Cost / authority / data boundary

Default incremental cash is `$0` / included capacity only.

Do not without separate exact authority:
- add paid SaaS, metered AI/provider usage, or paid overage;
- create/alter credentials, OAuth, PATs, MFA, recovery, billing, DNS, email, or account security;
- deploy/publish to production;
- contact customers/prospects or make commitments;
- ingest customer, PHI, CUI, financial-secret, credential, or other regulated/private payloads;
- add provider schedules/workers/background jobs;
- weaken security/review/branch rules;
- merge merely because implementation authored the candidate.

Use synthetic/public-safe fixtures until an exact later issue authorizes otherwise.

## Dependencies

Prefer the smallest dependency surface. A library must solve a real product/engineering need. Do not add a router, state framework, component framework, backend, analytics SDK, provider SDK, or AI SDK preemptively.

Pin accepted dependencies in the lockfile. Do not use floating source refs as production dependencies.

## Skills and tools

Follow `LowcountryDigitalWorks/business-operations#344`: reuse-first, curated, role-specific. Skills are guidance, never authority. Do not bulk-install skill/plugin catalogs or hidden MCP/runtime dependencies for this repository.

## GitHub governance

Repository settings, rulesets, branch protection, required checks, merge policy, and other consequential GitHub governance changes are owner-gated. Source may propose exact settings after stable CI check names exist; do not mutate those settings from ordinary implementation work.
