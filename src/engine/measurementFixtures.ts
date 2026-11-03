import { decodeMeasurementProjection } from './measurement-projection'
import type { WorkbenchProjection } from './projection'

export const measurementFixtureIds = ['follow-up-not-due', 'limited-comparison', 'ready-for-assessment', 'human-outcome'] as const
export type MeasurementFixtureId = (typeof measurementFixtureIds)[number]

const identity = {
  workspaceId: 'workspace:synthetic-human-review-001',
  tenantId: 'tenant:synthetic-ldw',
  siteId: 'site:harbor-demo',
  siteScopeRevisionId: 'scope-revision:human-review-001',
  trustedTarget: 'https://harbor-demo.example',
  generatedAt: '2026-10-30T14:10:00Z',
  evaluatedAt: '2026-10-30T14:10:00Z',
}
const decision = {
  id: 'decision:synthetic-investigate-services',
  disposition: 'investigate',
  summary: 'Review whether the services page warrants a human-authored recommendation after separate result validation.',
  recordedAt: '2026-10-30T14:09:00Z',
}
const methodology = { id: 'ldw-search-change-cohort', version: '1.0.0' }
const interpretationMethodology = { id: 'ldw-measurement-interpretation-claim-ceilings', version: '1.0.0', release: '0.22.0' }
const prohibited = ['causal_attribution', 'business_or_revenue_causality', 'universal_visibility', 'cross_provider_equivalence', 'automatic_recommendation_or_action']
const authorityNotes = [
  'Measurement state is projected from accepted G.A.S. semantics; Workbench does not recompute interpretation.',
  'Outcome direction is human/trusted-caller authored and is never inferred from numeric movement.',
]
const limitations = [
  'Search Change is the only generic measurement-plan methodology supplied in this Workbench slice.',
  'Claim ceilings describe what the supplied interpretation permits; they do not authorize production action or causal claims.',
]
const dueWindow = { start: '2026-11-05T00:00:00Z', end: '2026-11-12T23:59:59Z' }
const baseline = (value = 120) => ({
  id: 'measurement:synthetic-baseline',
  relationship: { role: 'baseline' },
  dueWindow: { start: '2026-10-01T00:00:00Z', end: '2026-10-28T23:59:59Z' },
  result: { state: 'measured', observedWindow: { start: '2026-10-01T00:00:00Z', end: '2026-10-28T23:59:59Z' }, observations: [{ id: 'observation:synthetic-baseline-clicks', value }] },
  comparability: { state: 'comparable' },
  methodology,
  createdAt: '2026-10-30T13:55:00Z',
})
const followUpMeasured = (value = 136, comparability: 'comparable' | 'discontinuous' = 'comparable') => ({
  id: 'measurement:synthetic-follow-up',
  relationship: { role: 'follow_up', baselineMeasurementId: 'measurement:synthetic-baseline' },
  dueWindow,
  result: { state: 'measured', observedWindow: { start: '2026-11-05T00:00:00Z', end: '2026-11-12T23:59:59Z' }, observations: [{ id: 'observation:synthetic-follow-up-clicks', value }] },
  comparability: comparability === 'comparable' ? { state: 'comparable' } : { state: 'discontinuous', reason: 'The supplied source or method context changed between windows.' },
  methodology,
  createdAt: '2026-11-13T00:10:00Z',
})
const plan = (ready: boolean, reasons: string[] = [], followUpObservationId = true) => ({
  id: 'gsc.change.package:synthetic-services-clicks',
  annotation: {
    id: 'change:synthetic-services-copy',
    summary: 'Human-recorded services page change.',
    occurredAt: '2026-10-30T13:00:00Z',
    recordedAt: '2026-10-30T13:05:00Z',
  },
  target: {
    rowIdentity: 'row:synthetic-services-query',
    query: 'harbor services',
    page: 'https://harbor-demo.example/services',
    metric: 'clicks',
    baselineObservationId: 'observation:synthetic-baseline-clicks',
    ...(followUpObservationId ? { followUpObservationId: 'observation:synthetic-follow-up-clicks' } : {}),
  },
  baselineMeasurementId: 'measurement:synthetic-baseline',
  followUpMeasurementId: 'measurement:synthetic-follow-up',
  readiness: ready ? { state: 'ready_for_human_assessment', reasons: [] } : { state: 'not_ready', reasons },
})
const interpretation = (state: 'blocked' | 'ready', comparability: 'unknown' | 'discontinuous' | 'comparable', reasons: string[]) => ({
  id: `measurement-interpretation:synthetic-${comparability}`,
  methodology: interpretationMethodology,
  designClass: 'annotated_pre_post',
  exposure: { state: 'not_applicable' },
  comparability: { state: comparability, reasons, baselineMeasurementId: 'measurement:synthetic-baseline', followUpMeasurementId: 'measurement:synthetic-follow-up' },
  readiness: state,
  claimCeiling: state === 'blocked' ? 'not_interpretable' : 'temporal_association_only',
  allowedClaimCodes: [state === 'blocked' ? 'no_change_claim_supported' : 'observed_temporal_change'],
  prohibitedOverclaimCodes: prohibited,
  limitations: ['human_outcome_required_for_outcome_recording', 'no_business_or_revenue_causality', 'no_universal_visibility_or_cross_provider_claim'],
})
function root(cycle: object, measurements: object[], interpretations: object[], outcomes: object[] = []) {
  return {
    schemaVersion: 'ldw.gas-workbench-measurement.v1',
    schemaMinorVersion: 0,
    identity,
    cycle,
    measurements,
    outcomes,
    interpretations,
    authorityNotes,
    limitations,
  }
}
export const measurementFixtureData = {
  'follow-up-not-due': root({
    dossierId: 'decision-cycle:synthetic-follow-up-not-due', sourceServiceBriefId: 'service-brief:synthetic-human-review', decision,
    readiness: { state: 'follow_up_not_due', reasons: ['follow_up_not_due'] }, recordedMeasurementIds: [],
    measurementPlan: plan(false, ['follow_up_not_due'], false),
  }, [baseline(), {
    id: 'measurement:synthetic-follow-up', relationship: { role: 'follow_up', baselineMeasurementId: 'measurement:synthetic-baseline' }, dueWindow,
    result: { state: 'not_due', reason: 'Follow-up measurement is not due.' }, comparability: { state: 'unknown', reason: 'No comparable measured follow-up observation is available.' }, methodology, createdAt: '2026-10-30T14:10:00Z',
  }], [interpretation('blocked', 'unknown', ['canonical_measurement_result_unavailable'])]),
  'limited-comparison': root({
    dossierId: 'decision-cycle:synthetic-limited-comparison', sourceServiceBriefId: 'service-brief:synthetic-human-review', decision,
    readiness: { state: 'follow_up_not_comparable', reasons: ['incomparable'] }, recordedMeasurementIds: ['measurement:synthetic-baseline', 'measurement:synthetic-follow-up'],
    measurementPlan: plan(false, ['incomparable']),
  }, [baseline(0), followUpMeasured(18, 'discontinuous')], [interpretation('blocked', 'discontinuous', ['source_or_method_context_changed'])]),
  'ready-for-assessment': root({
    dossierId: 'decision-cycle:synthetic-ready', sourceServiceBriefId: 'service-brief:synthetic-human-review', decision,
    readiness: { state: 'ready_for_human_assessment', reasons: [] }, recordedMeasurementIds: ['measurement:synthetic-baseline', 'measurement:synthetic-follow-up'],
    measurementPlan: plan(true),
  }, [baseline(), followUpMeasured()], [interpretation('ready', 'comparable', [])]),
  'human-outcome': root({
    dossierId: 'decision-cycle:synthetic-outcome', sourceServiceBriefId: 'service-brief:synthetic-human-review', decision,
    readiness: { state: 'outcome_recorded', reasons: [] }, recordedMeasurementIds: ['measurement:synthetic-baseline', 'measurement:synthetic-follow-up'],
    measurementPlan: plan(true),
  }, [baseline(), followUpMeasured()], [interpretation('ready', 'comparable', [])], [{
    id: 'outcome:synthetic-human-001', direction: 'improved', measurementIds: ['measurement:synthetic-baseline', 'measurement:synthetic-follow-up'], comparability: 'comparable',
    rationale: 'Human reviewer recorded an improved outcome after reviewing the comparable measurement pair and surrounding context.',
    attribution: { strength: 'none', reason: 'The supplied evidence does not establish causal attribution.' }, createdAt: '2026-11-13T00:20:00Z',
  }]),
} as const

export async function loadMeasurementFixture(id: MeasurementFixtureId, shell: WorkbenchProjection) {
  return decodeMeasurementProjection(measurementFixtureData[id], shell)
}
