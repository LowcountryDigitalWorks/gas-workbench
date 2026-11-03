import { decodeReportProjection } from './report-projection'
import type { WorkbenchProjection } from './projection'

export const reportFixtureIds = ['quiet-report', 'focused-evidence', 'decision-outcome', 'internal-appendix'] as const
export type ReportFixtureId = (typeof reportFixtureIds)[number]

const humanIdentity = {
  workspaceId: 'workspace:synthetic-human-review-001',
  tenantId: 'tenant:synthetic-ldw',
  siteId: 'site:harbor-demo',
  siteScopeRevisionId: 'scope-revision:human-review-001',
  trustedTarget: 'https://harbor-demo.example',
  generatedAt: '2026-10-30T14:10:00Z',
  evaluatedAt: '2026-10-30T14:10:00Z',
}
const outcomeIdentity = { ...humanIdentity, workspaceId: 'workspace:synthetic-report-outcome-001', generatedAt: '2026-11-13T00:20:00Z', evaluatedAt: '2026-11-13T00:20:00Z' }
const internalIdentity = { ...humanIdentity, workspaceId: 'workspace:synthetic-report-internal-001' }
const period = { start: '2026-10-01', end: '2026-10-28' }
const readiness = [
  { moduleId: 'evidence_diff', state: 'not_supplied', reasons: [] },
  { moduleId: 'review_history', state: 'not_supplied', reasons: [] },
  { moduleId: 'search_analytics', state: 'ready', reasons: [] },
  { moduleId: 'search_change', state: 'not_supplied', reasons: [] },
  { moduleId: 'page_focus', state: 'ready', reasons: [] },
  { moduleId: 'discovery_diagnostics', state: 'not_supplied', reasons: [] },
  { moduleId: 'ai_visibility', state: 'not_supplied', reasons: [] },
]
const focus = {
  moduleId: 'page_focus',
  kind: 'page_focus_candidate',
  state: 'candidate',
  label: 'https://harbor-demo.example/services',
  readinessContext: ['Separate SERP/result validation is required before any intent or content-architecture conclusion.'],
}
const sourceNotes = [
  { moduleId: 'search_analytics', release: '0.10', providers: ['google-search-console'], periods: [period], readiness: 'ready', reasons: [] },
  { moduleId: 'page_focus', release: '0.12', providers: ['google-search-console'], periods: [period], readiness: 'ready', reasons: [] },
]
const limitations = [
  'This report describes accepted evidence and human review state; it does not assign a universal health, severity, priority, or business-impact score.',
  'Human-selected focus items are review choices, not an automatic G.A.S. ranking.',
  'Observed change and outcome language remains descriptive unless the recorded human attribution explicitly states otherwise.',
]
const shellDecision = {
  disposition: 'investigate',
  summary: 'Review whether the services page warrants a human-authored recommendation after separate result validation.',
  readiness: 'measurement_not_planned',
  measurementPlanned: false,
  recordedMeasurementCount: 0,
  humanOutcomes: [],
}
function report(id: string, title: string, executiveSummary: string, observedChanges: string[], extras: Record<string, unknown> = {}) {
  return {
    version: '0.17.0',
    id,
    title,
    createdAt: '2026-10-30T14:12:00Z',
    context: { siteId: 'site:harbor-demo', target: 'https://harbor-demo.example', periods: [period] },
    executiveSummary,
    readiness,
    limitations,
    observedChanges,
    focusItems: [focus],
    nextReview: 'Revisit after the selected services-page evidence receives separate result validation.',
    sourceNotes,
    ...extras,
  }
}
function feature(reportValue: Record<string, unknown>, identity = humanIdentity) {
  return { schemaVersion: 'ldw.gas-workbench-report.v1', schemaMinorVersion: 0, identity, report: reportValue }
}

export const reportFixtureData = {
  'quiet-report': feature(report(
    'customer-report:4595eb83e38b461bcf92a4f3423e87148d99d06defb47f8282e4aec936b4f815',
    'Harbor Demo — Evidence Readiness Brief',
    'The supplied evidence is bounded and readable for the selected site. This report does not assert an alarm, score, or automatic priority.',
    [],
    { decision: shellDecision },
  )),
  'focused-evidence': feature(report(
    'customer-report:f53aa83e17e3a65b71c2e4407b4288c3f769affa8f661ad7e2f91f0f13c1c3e0',
    'Harbor Demo — Focused Evidence Report',
    'A human reviewer selected the services-page evidence for focused follow-up. The selection is not a G.A.S. ranking or business-impact score.',
    ['Human reviewer noted that the services page is the selected evidence focus for separate validation.'],
    { decision: shellDecision },
  )),
  'decision-outcome': feature(report(
    'customer-report:6a7b556dad3d47062c78a066b484fb97630f2e4a36f314f63c2758a2dd2d777e',
    'Harbor Demo — Decision and Outcome Report',
    'This report preserves a supplied human decision and human-authored outcome separately from the evidence and does not convert the outcome into causal attribution.',
    ['A follow-up review was completed after the selected services-page evidence was re-examined.'],
    {
      createdAt: '2026-11-13T00:25:00Z',
      decision: {
        disposition: 'recommend',
        summary: 'Human reviewer accepted a bounded services-page recommendation after separate validation.',
        readiness: 'outcome_recorded',
        recommendationLifecycle: 'accepted',
        recommendationRationale: 'The human reviewer accepted the recommendation after checking the supplied evidence and limitations.',
        measurementPlanned: true,
        recordedMeasurementCount: 2,
        humanOutcomes: [{ direction: 'improved', rationale: 'Human reviewer recorded an improved outcome after reviewing the supplied measurement pair and surrounding context.', attribution: 'none', createdAt: '2026-11-13T00:20:00Z' }],
      },
    },
  ), outcomeIdentity),
  'internal-appendix': feature(report(
    'customer-report:f20a22722c2976a255d7266a3035187be3bedcf62bc647a02d769d18fbe2770f',
    'Harbor Demo — Customer Report with Internal Appendix',
    'The customer-safe narrative remains concise while exact internal source-selection references are available separately for operator inspection.',
    ['The services-page evidence remains the human-selected focus for the next review.'],
    {
      internalAppendix: {
        workspaceId: 'workspace:synthetic-report-internal-001',
        serviceBriefId: 'service-brief:synthetic-human-review',
        selectedAttentionIds: ['attention:page-focus:services'],
      },
    },
  ), internalIdentity),
} as const

export async function loadReportFixture(id: ReportFixtureId, shell: WorkbenchProjection) {
  return decodeReportProjection(reportFixtureData[id], shell)
}
