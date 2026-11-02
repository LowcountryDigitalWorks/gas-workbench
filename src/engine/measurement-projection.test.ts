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
    result: Record<string, unknown>
    comparability: Record<string, unknown>
  }>
  plan: {
    followUpMeasurementId: string
    readiness: { reasons: string[] }
  }
  interpretation: {
    comparability: { baselineMeasurementId: string }
    claimCeiling: string
    readiness: string
    allowedClaimCodes: string[]
    prohibitedOverclaimCodes: string[]
  }
  outcomes: Array<{ measurementIds: string[] }>
  decision: { summary: string }
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
      [blocked, blockedShell, 'follow_up_not_ready'],
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
