# G.A.S. Workbench — Site integration readiness

Status: **synthetic/local preflight proof only** (Workbench issue #32). Not a production onboarding, customer-data integration, provider authorization, or deployment acceptance.

## Accepted source boundaries

The accepted G.A.S. Engine Release 0.19 portfolio operations output supplies **trusted inventory and run navigation facts**; Release 0.17 per-site operator workspaces supply **checked workspace evidence**. Workbench already has strict decoders for each artifact. The bounded helper in src/engine/portfolio-workspace-preflight.ts checks whether a separately supplied Release 0.17 artifact is consistent enough to **associate for presentation** with one inventory-selected Release 0.19 engagement.

The helper takes an already canonically decoded portfolio and a caller-supplied unknown workspace, decodes the workspace through the canonical Workbench decoder, and checks exact tenant ID, site ID, scope revision, trusted target, workspace ID and accepted Attention count. It explicitly distinguishes no current run, workspace not supplied, invalid projection, identity mismatch and matching projection. Only a match returns a decoded workspace.

This check does not authenticate tenants, prove that a portfolio was delivered by a trusted runtime, independently verify a Release 0.18 run, mint inventory authority, fetch remote artifacts, retrieve provider data, or verify a delegated account grant. Matching is **necessary but not sufficient** for real site access. The caller must independently enforce trusted inventory, authenticated scope, approved data transport and source/run integrity.

No current run and no supplied workspace are not healthy, successful, empty or zero evidence. Attention counts are navigation facts, never priority, severity or business performance.

## LDW / ECF / DFD integration candidate questions

These three names are *candidate sites offered by the owner*, not trusted inventory accepted by this proof. Store any actual classified answers in the owning private customer/operational system, not in a public GitHub repo.

| Gate | Required fact or decision before live use |
| --- | --- |
| Authorization | Confirm approved operator/customer scope and consent independently per site; public homepage access does not authorize private search or customer evidence |
| Inventory | Obtain exact trusted tenant, site, scope-revision, target and engagement identities from an approved authority issuer; do not infer these from URLs |
| Evidence origin | Identify which approved sanitized WQT, Search Analytics, discovery, AI visibility or manual evidence artifacts exist; preserve provider provenance, window, coverage and limitations |
| Run | Independently verify an accepted Release 0.18 managed-service run when present, and create an accepted Release 0.19 trusted inventory projection from that run |
| Workspace | Obtain accepted Release 0.17 operator workspace bytes from the same authoritative context; reject cross-tenant, cross-revision, wrong-target, wrong-workspace and Attention mismatches |
| Transport and authentication | Design an authorized private, read-only transport, tenant-scoped authentication and access controls; no credentials or tenant authority inside portfolio/browser bytes |
| Classification and lifecycle | Document customer-data classification, residency, logging, retention, rollback and deletion boundaries before moving evidence |
| Operator test | Prove synthetic adversarial cross-tenant/same-site-ID cases, stale revision and wrong target rejection, accessible failure, and no cross-site report leakage |
| Production gate | Separately accept security/privacy, customer authorization, hosting, cost, observability and rollback before deployment or real-data integration |

## Proposed order

1. Preserve and independently review this pure/local synthetic preflight on Workbench main.
2. Privately reconcile which candidate sites have trusted inventory, authorized source connections, accepted current runs and separately supplied workspaces. Unknown remains *not supplied*.
3. Select the smallest authenticated and tenant-bound private read path. Reuse accepted G.A.S. Engine, WQT and provider adapters; do not create a second provider client or control plane in the frontend.
4. After a separate exact runtime and classified-data gate, prove one authorized site read-only, retest identity and export isolation, and accept additional sites by explicit scope.

## Excluded

This work creates no provider API call, crawler, OAuth flow, new engine release, scheduler, DB, cloud service, runtime AI, customer portal, live-site scan, customer evidence import, production deployment or spend. The separate Workbench documentation PR #29 owns older README/architecture drift and remains untouched.