import { parsePortfolioProjection } from './portfolio-projection'

const policy = (id: string) => ({
  id: `portfolio-policy-${id}`,
  version: '1.0.0',
  sources: [
    { sourceFamily: 'manual_context', maxAgeSeconds: 7200 },
    { sourceFamily: 'search_analytics', maxAgeSeconds: 7200 },
    { sourceFamily: 'website_quality', maxAgeSeconds: 7200 },
  ],
})

const limitations = [
  'This LDW-internal portfolio projection aggregates operational metadata only; it does not benchmark customer performance or flatten cross-tenant evidence.',
  'Trusted inventory scope and target remain authoritative. Service-run IDs and artifacts are provenance/selectors and cannot mint portfolio authority.',
  'The browser console is presentation only and creates no write, scheduling, delivery, provider-network, or persistence authority.',
]

const alpha = {
  engagementId: 'engagement-alpha',
  label: 'Synthetic Alpha · current / fresh / report present',
  scope: { tenantId: 'tenant-alpha', siteId: 'shared-site', siteScopeRevisionId: 'scope-r1' },
  trustedTarget: 'https://alpha.example.test',
  freshnessPolicy: policy('alpha'),
  currentRunState: 'present',
  currentRunId: `managed-service-run:${'1'.repeat(64)}`,
  workspaceId: `workspace:${'2'.repeat(64)}`,
  runPeriod: { start: '2026-10-01T00:00:00.000Z', end: '2026-10-04T11:00:00.000Z' },
  runEvaluatedAt: '2026-10-04T11:00:00.000Z',
  sources: [
    { receiptId: 'manual-context', sourceFamily: 'manual_context', sourceState: 'supplied', freshness: { state: 'fresh', anchorKind: 'received_at', anchorAt: '2026-10-04T11:00:00.000Z', ageSeconds: 3600, maxAgeSeconds: 7200 } },
    { receiptId: 'search-export', sourceFamily: 'search_analytics', sourceState: 'supplied', freshness: { state: 'fresh', anchorKind: 'source_window_end', anchorAt: '2026-10-04T11:00:00.000Z', ageSeconds: 3600, maxAgeSeconds: 7200 } },
    { receiptId: 'wqt-report', sourceFamily: 'website_quality', sourceState: 'supplied', freshness: { state: 'not_evaluable', reason: 'freshness_timestamp_unavailable' } },
  ],
  readiness: [
    { moduleId: 'search_analytics', state: 'ready', reasons: [] },
    { moduleId: 'website_quality', state: 'ready', reasons: [] },
  ],
  attentionCount: 1,
  followUp: { decisionCyclePresent: true, readiness: 'measurement_not_planned', reasons: [] },
  report: { state: 'present', reportId: `customer-report:${'3'.repeat(64)}` },
  exceptions: [
    { kind: 'attention_present' },
    { kind: 'source_freshness_unknown', receiptId: 'wqt-report', sourceFamily: 'website_quality' },
  ],
  limitations: [
    'Source freshness is caller-policy operational metadata only and never overrides accepted module readiness.',
    'Attention count is an exact navigation count only; it is not unread state, priority, severity, or business impact.',
  ],
}

const beta = {
  engagementId: 'engagement-beta',
  label: 'Synthetic Beta · stale / unavailable / not requested',
  scope: { tenantId: 'tenant-beta', siteId: 'shared-site', siteScopeRevisionId: 'scope-r1' },
  trustedTarget: 'https://beta.example.test',
  freshnessPolicy: policy('beta'),
  currentRunState: 'present',
  currentRunId: `managed-service-run:${'4'.repeat(64)}`,
  workspaceId: `workspace:${'5'.repeat(64)}`,
  runPeriod: { start: '2026-09-28T00:00:00.000Z', end: '2026-10-04T10:00:00.000Z' },
  runEvaluatedAt: '2026-10-04T10:00:00.000Z',
  sources: [
    { receiptId: 'ai-export', sourceFamily: 'ai_visibility', sourceState: 'unsupported', freshness: { state: 'not_evaluable', reason: 'source_state_not_evaluable' } },
    { receiptId: 'discovery-export', sourceFamily: 'discovery', sourceState: 'not_supplied', freshness: { state: 'not_evaluable', reason: 'source_state_not_evaluable' } },
    { receiptId: 'manual-context', sourceFamily: 'manual_context', sourceState: 'supplied', freshness: { state: 'fresh', anchorKind: 'received_at', anchorAt: '2026-10-04T11:00:00.000Z', ageSeconds: 3600, maxAgeSeconds: 7200 } },
    { receiptId: 'search-export', sourceFamily: 'search_analytics', sourceState: 'supplied', freshness: { state: 'stale', anchorKind: 'source_window_end', anchorAt: '2026-10-04T09:00:00.000Z', ageSeconds: 10800, maxAgeSeconds: 7200 } },
    { receiptId: 'wqt-report', sourceFamily: 'website_quality', sourceState: 'unavailable', freshness: { state: 'not_evaluable', reason: 'source_state_not_evaluable' } },
  ],
  readiness: [
    { moduleId: 'search_analytics', state: 'limited', reasons: ['coverage_incomplete'] },
    { moduleId: 'website_quality', state: 'unavailable', reasons: ['source_unavailable'] },
  ],
  attentionCount: 0,
  followUp: { decisionCyclePresent: true, readiness: 'recommendation_in_review', reasons: [] },
  report: { state: 'not_requested' },
  exceptions: [
    { kind: 'report_not_requested' },
    { kind: 'source_not_supplied', receiptId: 'discovery-export', sourceFamily: 'discovery' },
    { kind: 'source_stale', receiptId: 'search-export', sourceFamily: 'search_analytics' },
    { kind: 'source_unavailable', receiptId: 'wqt-report', sourceFamily: 'website_quality' },
    { kind: 'source_unsupported', receiptId: 'ai-export', sourceFamily: 'ai_visibility' },
  ],
  limitations: [
    'Source freshness is caller-policy operational metadata only and never overrides accepted module readiness.',
    'Attention count is an exact navigation count only; it is not unread state, priority, severity, or business impact.',
  ],
}

const noRun = {
  engagementId: 'engagement-no-current-run',
  label: 'Synthetic Beta · trusted inventory / no current run',
  scope: { tenantId: 'tenant-beta', siteId: 'no-run-site', siteScopeRevisionId: 'scope-r2' },
  trustedTarget: 'https://no-run.example.test',
  freshnessPolicy: policy('no-run'),
  currentRunState: 'no_current_run',
  sources: [],
  readiness: [],
  attentionCount: 0,
  exceptions: [{ kind: 'no_current_run' }],
  limitations: ['No accepted current Release 0.18 ManagedServiceRun was supplied for this trusted inventory entry; this is not healthy or zero evidence.'],
}

export const mixedPortfolioFixture = {
  schemaVersion: 'ldw.gas-workbench-portfolio.v1',
  schemaMinorVersion: 0,
  portfolio: {
    version: '0.19.0',
    id: `portfolio-operations:${'a'.repeat(64)}`,
    classification: 'ldw_internal',
    evaluatedAt: '2026-10-04T12:00:00.000Z',
    summary: {
      engagementCount: 3,
      currentRun: { present: 2, noCurrentRun: 1 },
      attentionPresentEngagements: 1,
      sourceStates: [{ state: 'supplied', count: 5 }, { state: 'not_supplied', count: 1 }, { state: 'unavailable', count: 1 }, { state: 'unsupported', count: 1 }],
      freshnessStates: [{ state: 'fresh', count: 3 }, { state: 'stale', count: 1 }, { state: 'not_evaluable', count: 4 }],
      moduleReadinessStates: [{ state: 'not_supplied', count: 0 }, { state: 'ready', count: 2 }, { state: 'limited', count: 1 }, { state: 'not_ready', count: 0 }, { state: 'unavailable', count: 1 }],
      decisionReadinessStates: [
        { state: 'deferred_or_dismissed', count: 0 }, { state: 'recommendation_not_created', count: 0 }, { state: 'recommendation_proposed', count: 0 }, { state: 'recommendation_in_review', count: 1 }, { state: 'recommendation_accepted', count: 0 }, { state: 'recommendation_rejected', count: 0 }, { state: 'recommendation_superseded', count: 0 }, { state: 'measurement_not_planned', count: 1 }, { state: 'measurements_not_recorded', count: 0 }, { state: 'follow_up_not_due', count: 0 }, { state: 'follow_up_not_measured', count: 0 }, { state: 'follow_up_not_comparable', count: 0 }, { state: 'follow_up_not_ready', count: 0 }, { state: 'ready_for_human_assessment', count: 0 }, { state: 'outcome_recorded', count: 0 },
      ],
      reportStates: [{ state: 'not_requested', count: 1 }, { state: 'present', count: 1 }],
      exceptionKinds: [{ state: 'no_current_run', count: 1 }, { state: 'source_not_supplied', count: 1 }, { state: 'source_unavailable', count: 1 }, { state: 'source_unsupported', count: 1 }, { state: 'source_freshness_unknown', count: 1 }, { state: 'source_stale', count: 1 }, { state: 'attention_present', count: 1 }, { state: 'report_not_requested', count: 1 }],
    },
    engagements: [alpha, beta, noRun],
    limitations,
  },
} as const

export function loadPortfolioFixture() { return parsePortfolioProjection(mixedPortfolioFixture) }
