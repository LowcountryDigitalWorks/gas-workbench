import { describe, expect, it } from 'vitest'
import { decodeWorkbenchProjection } from './integrity'
import followUpShell from './fixtures/measurement-follow-up-not-due.json'
import incomparableShell from './fixtures/measurement-measured-not-comparable.json'
import readyShell from './fixtures/measurement-ready-human-assessment.json'
import outcomeShell from './fixtures/measurement-human-outcome-recorded.json'
import blockedShell from './fixtures/measurement-blocked-not-interpretable.json'
import followUp from './fixtures/measurement/follow-up-not-due.json'
import incomparable from './fixtures/measurement/measured-not-comparable.json'
import ready from './fixtures/measurement/ready-human-assessment.json'
import outcome from './fixtures/measurement/human-outcome-recorded.json'
import blocked from './fixtures/measurement/blocked-not-interpretable.json'
import { decodeMeasurementProjection, parseMeasurementProjection } from './measurement-projection'

const copy = <T,>(value: T): T => structuredClone(value)

type MutableMeasurementFixture = {
  measurements: Array<{
    relationship: { baselineMeasurementId?: string }
    result: {
      state?: string
      reason?: string
      observedWindow?: { start: string; end: string }
      observations?: Array<{ referenceId: string; value: { state: string; type?: string; value?: unknown; reason?: string } }>
    }
    comparability: { state?: string; reason?: string }
    methodology: { id: string; version: string }
  }>
  plan: {
    followUpMeasurementId: string
    target: { baselineObservationId: string; followUpObservationId?: string }
    readiness: { state: string; reasons: string[] }
  }
  interpretation: {
    comparability: { state: string; reasons: string[]; baselineMeasurementId: string; followUpMeasurementId: string }
    claimCeiling: string
    readiness: string
    allowedClaimCodes: string[]
    prohibitedOverclaimCodes: string[]
  }
  outcomes: Array<{ measurementIds: string[] }>
  decision: { summary: string }
  cycleReadiness: { state: string; reasons: string[] }
}

type MutableShellFixture = {
  workspace: {
    navigation: {
      decisionCycle: { recordedMeasurementCount: number }
    }
  }
}

const mutableFeature = (value: unknown): MutableMeasurementFixture =>
  copy(value) as unknown as MutableMeasurementFixture

const readyWorkbench = decodeWorkbenchProjection(readyShell)

describe('Measurement feature projection boundary', () => {
  it('decodes each matched synthetic case against its Workbench shell', () => {
    const cases = [
      [followUp, followUpShell, 'follow_up_not_due'],
      [incomparable, incomparableShell, 'follow_up_not_comparable'],
      [ready, readyShell, 'ready_for_human_assessment'],
      [outcome, outcomeShell, 'outcome_recorded'],
      [blocked, blockedShell, 'ready_for_human_assessment'],
    ] as const
    for (const [feature, shell, expected] of cases) {
      expect(decodeMeasurementProjection(feature, decodeWorkbenchProjection(shell)).cycleReadiness.state).toBe(expected)
    }
  })

  it('rejects wrong schema versions, widening, and shell identity mismatch', () => {
    const wrong = copy(ready) as Record<string, unknown>
    wrong.schemaMinorVersion = 1
    expect(() => parseMeasurementProjection(wrong)).toThrow('Unsupported Measurement')
    const widened = copy(ready) as Record<string, unknown>
    widened.futureField = true
    expect(() => parseMeasurementProjection(widened)).toThrow('not supported')
    const mismatched = copy(readyShell) as { workspace: { scope: { siteScopeRevisionId: string } } }
    mismatched.workspace.scope.siteScopeRevisionId = 'scope:other'
    expect(() => decodeMeasurementProjection(ready, decodeWorkbenchProjection(mismatched))).toThrow('identities do not match')
  })

  it('rejects duplicate measurement and outcome IDs', () => {
    const duplicateMeasurement = copy(ready) as { measurements: unknown[] }
    duplicateMeasurement.measurements.push(copy(duplicateMeasurement.measurements[0]))
    expect(() => parseMeasurementProjection(duplicateMeasurement)).toThrow('duplicate IDs')
    const duplicateOutcome = copy(outcome) as { outcomes: unknown[] }
    duplicateOutcome.outcomes.push(copy(duplicateOutcome.outcomes[0]))
    expect(() => parseMeasurementProjection(duplicateOutcome)).toThrow('duplicate IDs')
  })

  it('binds follow-up, plan, interpretation, and outcome references to supplied records', () => {
    const badFollow = mutableFeature(ready)
    badFollow.measurements[1].relationship.baselineMeasurementId = 'measurement:missing'
    expect(() => parseMeasurementProjection(badFollow)).toThrow('must reference a supplied baseline')

    const badPlan = mutableFeature(ready)
    badPlan.plan.followUpMeasurementId = 'measurement:missing'
    expect(() => parseMeasurementProjection(badPlan)).toThrow('followUpMeasurementId must resolve')

    const badInterpretation = mutableFeature(ready)
    badInterpretation.interpretation.comparability.baselineMeasurementId = 'measurement:missing'
    expect(() => parseMeasurementProjection(badInterpretation)).toThrow('baselineMeasurementId must resolve')

    const badOutcome = mutableFeature(outcome)
    badOutcome.outcomes[0].measurementIds[1] = 'measurement:missing'
    expect(() => parseMeasurementProjection(badOutcome)).toThrow('references absent measurement')
  })

  it('binds Search Change observation identities, methodology, and readiness to the linked records', () => {
    const badBaselineObservation = mutableFeature(ready)
    badBaselineObservation.plan.target.baselineObservationId = 'observation:missing'
    expect(() => parseMeasurementProjection(badBaselineObservation)).toThrow('baselineObservationId must resolve')

    const badFollowObservation = mutableFeature(ready)
    badFollowObservation.plan.target.followUpObservationId = 'observation:missing'
    expect(() => parseMeasurementProjection(badFollowObservation)).toThrow('followUpObservationId')

    const badMethodology = mutableFeature(ready)
    badMethodology.measurements[1].methodology.id = 'invented-methodology'
    expect(() => parseMeasurementProjection(badMethodology)).toThrow('ldw-search-change-cohort')

    const nonComparableClaimedReady = mutableFeature(incomparable)
    nonComparableClaimedReady.plan.readiness.state = 'ready_for_human_assessment'
    nonComparableClaimedReady.plan.readiness.reasons = []
    expect(() => parseMeasurementProjection(nonComparableClaimedReady)).toThrow('Non-comparable measured Search Change')

    const notDueClaimedReady = mutableFeature(followUp)
    notDueClaimedReady.plan.readiness.state = 'ready_for_human_assessment'
    notDueClaimedReady.plan.readiness.reasons = []
    expect(() => parseMeasurementProjection(notDueClaimedReady)).toThrow('Unmeasured Search Change follow-up cannot be ready')

    const wrongNotDueReason = mutableFeature(followUp)
    wrongNotDueReason.plan.readiness.reasons = ['target_missing']
    expect(() => parseMeasurementProjection(wrongNotDueReason)).toThrow('exact follow_up_not_due')
  })

  it('prevents Release 0.22 comparable interpretation from outrunning visible canonical evidence', () => {
    const unknownObservation = mutableFeature(ready)
    unknownObservation.measurements[0].result.observations![0].value = { state: 'unknown', reason: 'synthetic missing observation' }
    expect(() => parseMeasurementProjection(unknownObservation)).toThrow('visibly block comparability')

    const discontinuousRecord = mutableFeature(incomparable)
    discontinuousRecord.interpretation.comparability.state = 'comparable'
    discontinuousRecord.interpretation.comparability.reasons = []
    discontinuousRecord.interpretation.claimCeiling = 'temporal_association_only'
    discontinuousRecord.interpretation.readiness = 'ready'
    discontinuousRecord.interpretation.allowedClaimCodes = ['observed_temporal_change']
    expect(() => parseMeasurementProjection(discontinuousRecord)).toThrow('visibly block comparability')

    const unavailableFollowUp = mutableFeature(followUp)
    unavailableFollowUp.interpretation.comparability.state = 'comparable'
    unavailableFollowUp.interpretation.comparability.reasons = []
    unavailableFollowUp.interpretation.claimCeiling = 'temporal_association_only'
    unavailableFollowUp.interpretation.readiness = 'ready'
    unavailableFollowUp.interpretation.allowedClaimCodes = ['observed_temporal_change']
    expect(() => parseMeasurementProjection(unavailableFollowUp)).toThrow('visibly block comparability')

    const overlappingWindows = mutableFeature(ready)
    overlappingWindows.measurements[0].result.observedWindow!.end = '2026-11-02T00:00:00Z'
    expect(() => parseMeasurementProjection(overlappingWindows)).toThrow('visibly block comparability')
  })

  it('keeps Release 0.16 cycle readiness coherent with projected plan, records, and outcomes', () => {
    const badPlanCycle = mutableFeature(ready)
    badPlanCycle.cycleReadiness.state = 'follow_up_not_ready'
    badPlanCycle.cycleReadiness.reasons = ['source_not_final']
    expect(() => parseMeasurementProjection(badPlanCycle)).toThrow('cycle readiness contradicts')

    const badOutcomeCycle = mutableFeature(outcome)
    badOutcomeCycle.cycleReadiness.state = 'ready_for_human_assessment'
    expect(() => parseMeasurementProjection(badOutcomeCycle)).toThrow('outcome_recorded')
  })

  it('keeps result-state shapes fail-closed', () => {
    const missingWindow = mutableFeature(ready)
    delete missingWindow.measurements[0].result.observedWindow
    expect(() => parseMeasurementProjection(missingWindow)).toThrow('observedWindow is required')

    const fakeMeasuredFields = mutableFeature(followUp)
    fakeMeasuredFields.measurements[1].result.observedWindow = { start: '2026-11-01T00:00:00Z', end: '2026-11-02T00:00:00Z' }
    expect(() => parseMeasurementProjection(fakeMeasuredFields)).toThrow('not supported')
  })

  it('requires comparability reasons only for unknown/discontinuous records', () => {
    const comparableReason = mutableFeature(ready)
    comparableReason.measurements[0].comparability.reason = 'should-not-exist'
    expect(() => parseMeasurementProjection(comparableReason)).toThrow('comparable cannot carry a reason')

    const missingReason = mutableFeature(incomparable)
    delete missingReason.measurements[1].comparability.reason
    expect(() => parseMeasurementProjection(missingReason)).toThrow('requires a reason')
  })

  it('preserves exact Search Change readiness vocabulary and reason coherence', () => {
    const invalidReason = mutableFeature(followUp)
    invalidReason.plan.readiness.reasons = ['invented_reason']
    expect(() => parseMeasurementProjection(invalidReason)).toThrow('unsupported value')

    const readyWithReason = mutableFeature(ready)
    readyWithReason.plan.readiness.reasons = ['follow_up_not_due']
    expect(() => parseMeasurementProjection(readyWithReason)).toThrow('cannot carry reasons')
  })

  it('preserves Release 0.22 claim-ceiling/readiness/code relationships', () => {
    expect(parseMeasurementProjection(ready).interpretation).toMatchObject({
      readiness: 'ready',
      claimCeiling: 'temporal_association_only',
      allowedClaimCodes: ['observed_temporal_change'],
    })
    const stronger = mutableFeature(incomparable)
    stronger.interpretation.claimCeiling = 'temporal_association_only'
    stronger.interpretation.readiness = 'ready'
    stronger.interpretation.allowedClaimCodes = ['observed_temporal_change']
    expect(() => parseMeasurementProjection(stronger)).toThrow('non-comparable interpretation')

    const inventedAllowed = mutableFeature(ready)
    inventedAllowed.interpretation.allowedClaimCodes = ['invented_claim']
    expect(() => parseMeasurementProjection(inventedAllowed)).toThrow('contradict the accepted claim ceiling')

    const missingProhibition = mutableFeature(ready)
    missingProhibition.interpretation.prohibitedOverclaimCodes.pop()
    expect(() => parseMeasurementProjection(missingProhibition)).toThrow('preserve the accepted Release 0.22 set')
  })

  it('keeps observed numeric zero distinct from missing/unknown evidence', () => {
    const decoded = parseMeasurementProjection(ready)
    const baseline = decoded.measurements[0].result
    expect(baseline.state).toBe('measured')
    if (baseline.state === 'measured') expect(baseline.observations?.[0].value.value).toBe(0)

    const blockedDecoded = parseMeasurementProjection(blocked)
    const blockedBaseline = blockedDecoded.measurements[0].result
    expect(blockedBaseline.state).toBe('measured')
    if (blockedBaseline.state === 'measured') expect(blockedBaseline.observations?.[0].value).toMatchObject({ state: 'unknown' })
  })

  it('requires human outcome direction to remain explicit supplied state', () => {
    const decoded = decodeMeasurementProjection(outcome, decodeWorkbenchProjection(outcomeShell))
    expect(decoded.outcomes[0]).toMatchObject({ direction: 'improved', attribution: { strength: 'association' } })
    expect(decoded.outcomes[0].rationale).toContain('Human reviewer recorded')
    expect(decoded.measurements[0].result.state).toBe('measured')
    expect(decoded.measurements[1].result.state).toBe('measured')
  })

  it('rejects a feature that contradicts shell decision or navigation counts', () => {
    const badDecision = mutableFeature(ready)
    badDecision.decision.summary = 'Different decision'
    expect(() => decodeMeasurementProjection(badDecision, readyWorkbench)).toThrow('decision does not match')

    const countMismatch = copy(readyShell) as unknown as MutableShellFixture
    countMismatch.workspace.navigation.decisionCycle.recordedMeasurementCount = 1
    expect(() => decodeMeasurementProjection(ready, decodeWorkbenchProjection(countMismatch))).toThrow('record counts do not match')
  })
})
