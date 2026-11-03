import { describe, expect, it } from 'vitest'
import shellJson from './fixtures/human-review.json'
import { decodeWorkbenchProjection } from './integrity'
import { decodeMeasurementProjection, parseMeasurementProjection } from './measurement-projection'
import { measurementFixtureData, measurementFixtureIds } from './measurementFixtures'

const shell = decodeWorkbenchProjection(shellJson)
const clone = <T,>(value: T): T => structuredClone(value)

describe('Measurement feature projection boundary', () => {
  it('decodes all bounded walkthroughs against the matched shell identity', () => {
    for (const id of measurementFixtureIds) {
      const feature = decodeMeasurementProjection(measurementFixtureData[id], shell)
      expect(feature.identity.workspaceId).toBe(shell.source.workspaceId)
      expect(feature.cycle.decision.id).toBe('decision:synthetic-investigate-services')
    }
  })

  it('rejects wrong versions and unknown widening', () => {
    const wrong = clone(measurementFixtureData['ready-for-assessment']) as Record<string, unknown>
    wrong.schemaMinorVersion = 1
    expect(() => parseMeasurementProjection(wrong)).toThrow('Unsupported Measurement')
    const widened = clone(measurementFixtureData['ready-for-assessment']) as Record<string, unknown>
    widened.futureField = true
    expect(() => parseMeasurementProjection(widened)).toThrow('not supported')
  })

  it('rejects shell identity mismatch', () => {
    const mismatch = clone(shellJson) as { workspace: { scope: { siteScopeRevisionId: string } } }
    mismatch.workspace.scope.siteScopeRevisionId = 'scope:other'
    expect(() => decodeMeasurementProjection(measurementFixtureData['ready-for-assessment'], decodeWorkbenchProjection(mismatch))).toThrow('identities do not match')
  })

  it('rejects duplicate IDs, dangling links, and wrong-role measurement relationships', () => {
    const duplicate = clone(measurementFixtureData['ready-for-assessment']) as { measurements: Record<string, unknown>[] }
    duplicate.measurements[1].id = duplicate.measurements[0].id
    expect(() => parseMeasurementProjection(duplicate)).toThrow('duplicate IDs')
    const dangling = clone(measurementFixtureData['ready-for-assessment']) as { measurements: { relationship: Record<string, unknown> }[] }
    dangling.measurements[1].relationship.baselineMeasurementId = 'measurement:missing'
    expect(() => parseMeasurementProjection(dangling)).toThrow('references absent baseline')
    const wrongRole = clone(measurementFixtureData['ready-for-assessment']) as { measurements: { id: string; relationship: Record<string, unknown> }[] }
    wrongRole.measurements[1].relationship.baselineMeasurementId = wrongRole.measurements[1].id
    expect(() => parseMeasurementProjection(wrongRole)).toThrow('must reference a supplied baseline measurement')
  })

  it('fails closed on impossible measurement result and comparability shapes', () => {
    const measured = clone(measurementFixtureData['ready-for-assessment']) as { measurements: { result: Record<string, unknown> }[] }
    delete measured.measurements[0].result.observedWindow
    expect(() => parseMeasurementProjection(measured)).toThrow('observedWindow is required')
    const pending = clone(measurementFixtureData['follow-up-not-due']) as { measurements: { result: Record<string, unknown> }[] }
    pending.measurements[1].result.observations = []
    expect(() => parseMeasurementProjection(pending)).toThrow('observations is not supported')
    const comparable = clone(measurementFixtureData['ready-for-assessment']) as { measurements: { comparability: Record<string, unknown> }[] }
    comparable.measurements[0].comparability.reason = 'should not exist'
    expect(() => parseMeasurementProjection(comparable)).toThrow('reason is not supported')
  })

  it('requires plan, interpretation, and outcome references to resolve', () => {
    const plan = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { measurementPlan: Record<string, unknown> } }
    plan.cycle.measurementPlan.followUpMeasurementId = 'measurement:missing'
    expect(() => parseMeasurementProjection(plan)).toThrow('plan IDs must resolve')
    const wrongPlanRoles = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { measurementPlan: Record<string, unknown> } }
    wrongPlanRoles.cycle.measurementPlan.baselineMeasurementId = 'measurement:synthetic-follow-up'
    wrongPlanRoles.cycle.measurementPlan.followUpMeasurementId = 'measurement:synthetic-baseline'
    expect(() => parseMeasurementProjection(wrongPlanRoles)).toThrow('baseline/follow-up records by role')
    const danglingPlanObservation = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { measurementPlan: { target: Record<string, unknown> } } }
    danglingPlanObservation.cycle.measurementPlan.target.baselineObservationId = 'observation:missing'
    expect(() => parseMeasurementProjection(danglingPlanObservation)).toThrow('baseline observation must resolve')
    const wrongSidePlanObservation = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { measurementPlan: { target: Record<string, unknown> } } }
    wrongSidePlanObservation.cycle.measurementPlan.target.followUpObservationId = 'observation:synthetic-baseline-clicks'
    expect(() => parseMeasurementProjection(wrongSidePlanObservation)).toThrow('follow-up observation must resolve')
    const interpretation = clone(measurementFixtureData['ready-for-assessment']) as { interpretations: { comparability: Record<string, unknown> }[] }
    interpretation.interpretations[0].comparability.followUpMeasurementId = 'measurement:missing'
    expect(() => parseMeasurementProjection(interpretation)).toThrow('references absent measurement records')
    const swappedInterpretation = clone(measurementFixtureData['ready-for-assessment']) as { interpretations: { comparability: Record<string, unknown> }[] }
    swappedInterpretation.interpretations[0].comparability.baselineMeasurementId = 'measurement:synthetic-follow-up'
    swappedInterpretation.interpretations[0].comparability.followUpMeasurementId = 'measurement:synthetic-baseline'
    expect(() => parseMeasurementProjection(swappedInterpretation)).toThrow('one linked measurement pair')
    const outcome = clone(measurementFixtureData['human-outcome']) as { outcomes: { measurementIds: string[] }[] }
    outcome.outcomes[0].measurementIds[1] = 'measurement:missing'
    expect(() => parseMeasurementProjection(outcome)).toThrow('references absent measurement')

    const wrongExistingPair = clone(measurementFixtureData['human-outcome']) as { measurements: { id: string }[]; outcomes: { measurementIds: string[] }[] }
    const otherBaseline = structuredClone(wrongExistingPair.measurements[0])
    otherBaseline.id = 'measurement:other-baseline'
    wrongExistingPair.measurements.push(otherBaseline)
    wrongExistingPair.outcomes[0].measurementIds = ['measurement:synthetic-baseline', 'measurement:other-baseline']
    expect(() => parseMeasurementProjection(wrongExistingPair)).toThrow('exact supplied measurement-plan pair')
  })


  it('rejects cycle readiness that contradicts supplied projected state', () => {
    const missingOutcome = clone(measurementFixtureData['human-outcome']) as { outcomes: unknown[] }
    missingOutcome.outcomes = []
    expect(() => parseMeasurementProjection(missingOutcome)).toThrow('outcome_recorded requires')

    const falseNotDue = clone(measurementFixtureData['follow-up-not-due']) as { measurements: Record<string, unknown>[] }
    falseNotDue.measurements[1] = structuredClone((measurementFixtureData['ready-for-assessment'] as { measurements: Record<string, unknown>[] }).measurements[1])
    expect(() => parseMeasurementProjection(falseNotDue)).toThrow('Release 0.16 plan and measurement state')

    const falseReady = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { measurementPlan: { readiness: { state: string; reasons: string[] } } } }
    falseReady.cycle.measurementPlan.readiness = { state: 'not_ready', reasons: ['source_not_final'] }
    expect(() => parseMeasurementProjection(falseReady)).toThrow('Release 0.16 plan and measurement state')

    const deferredReady = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { decision: { disposition: string } } }
    deferredReady.cycle.decision.disposition = 'defer'
    expect(() => parseMeasurementProjection(deferredReady)).toThrow('deferred_or_dismissed')

    const notReady = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { readiness: { state: string; reasons: string[] }; measurementPlan: { readiness: { state: string; reasons: string[] } } } }
    notReady.cycle.readiness = { state: 'follow_up_not_ready', reasons: ['source_not_final'] }
    notReady.cycle.measurementPlan.readiness = { state: 'not_ready', reasons: ['source_not_final'] }
    expect(parseMeasurementProjection(notReady).cycle.readiness).toEqual({ state: 'follow_up_not_ready', reasons: ['source_not_final'] })

    const falseNotReady = clone(notReady)
    falseNotReady.cycle.measurementPlan.readiness = { state: 'ready_for_human_assessment', reasons: [] }
    expect(() => parseMeasurementProjection(falseNotReady)).toThrow('Release 0.16 plan and measurement state')

    const unrecorded = clone(measurementFixtureData['ready-for-assessment']) as { cycle: { readiness: { state: string; reasons: string[] }; recordedMeasurementIds: string[] } }
    unrecorded.cycle.recordedMeasurementIds = []
    unrecorded.cycle.readiness = { state: 'measurements_not_recorded', reasons: ['prepared_measurements_not_yet_recorded'] }
    expect(parseMeasurementProjection(unrecorded).cycle.readiness).toEqual({ state: 'measurements_not_recorded', reasons: ['prepared_measurements_not_yet_recorded'] })

    const falseRecorded = clone(unrecorded)
    falseRecorded.cycle.readiness = { state: 'ready_for_human_assessment', reasons: [] }
    expect(() => parseMeasurementProjection(falseRecorded)).toThrow('Release 0.16 plan and measurement state')
  })

  it('keeps Release 0.22 vocabularies strict without recomputing interpretation mappings', () => {
    const badCode = clone(measurementFixtureData['ready-for-assessment']) as { interpretations: { allowedClaimCodes: string[] }[] }
    badCode.interpretations[0].allowedClaimCodes = ['invented_claim_code']
    expect(() => parseMeasurementProjection(badCode)).toThrow('unsupported value')
    const badReadiness = clone(measurementFixtureData['limited-comparison']) as { interpretations: { readiness: string }[] }
    badReadiness.interpretations[0].readiness = 'invented_readiness'
    expect(() => parseMeasurementProjection(badReadiness)).toThrow('unsupported value')

    const supplied = clone(measurementFixtureData['ready-for-assessment']) as { interpretations: { readiness: string; claimCeiling: string; allowedClaimCodes: string[] }[] }
    supplied.interpretations[0].readiness = 'blocked'
    supplied.interpretations[0].claimCeiling = 'temporal_association_only'
    supplied.interpretations[0].allowedClaimCodes = ['observed_temporal_change']
    const parsed = parseMeasurementProjection(supplied)
    expect(parsed.interpretations[0]).toMatchObject({ readiness: 'blocked', claimCeiling: 'temporal_association_only', allowedClaimCodes: ['observed_temporal_change'] })

    const comparableWithReason = clone(measurementFixtureData['ready-for-assessment']) as { interpretations: { designClass: string; readiness: string; claimCeiling: string; allowedClaimCodes: string[]; comparability: { state: string; reasons: string[] } }[] }
    comparableWithReason.interpretations[0].designClass = 'ai_prompt_cohort_observation'
    comparableWithReason.interpretations[0].readiness = 'limited'
    comparableWithReason.interpretations[0].claimCeiling = 'descriptive_observation_only'
    comparableWithReason.interpretations[0].allowedClaimCodes = ['exact_observation_description']
    comparableWithReason.interpretations[0].comparability = { ...comparableWithReason.interpretations[0].comparability, state: 'comparable', reasons: ['ai_prompt_metric_semantics_required'] }
    expect(parseMeasurementProjection(comparableWithReason).interpretations[0].comparability).toMatchObject({ state: 'comparable', reasons: ['ai_prompt_metric_semantics_required'] })

    const humanWithBlockedInterpretation = clone(measurementFixtureData['human-outcome']) as { interpretations: { readiness: string; claimCeiling: string; allowedClaimCodes: string[]; comparability: { state: string; reasons: string[] } }[] }
    humanWithBlockedInterpretation.interpretations[0].readiness = 'blocked'
    humanWithBlockedInterpretation.interpretations[0].claimCeiling = 'not_interpretable'
    humanWithBlockedInterpretation.interpretations[0].allowedClaimCodes = ['no_change_claim_supported']
    humanWithBlockedInterpretation.interpretations[0].comparability = { ...humanWithBlockedInterpretation.interpretations[0].comparability, state: 'discontinuous', reasons: ['source_or_method_context_changed'] }
    expect(parseMeasurementProjection(humanWithBlockedInterpretation).outcomes[0].direction).toBe('improved')
  })

  it('keeps observed numeric zero distinct from missing or not measured', () => {
    const limited = parseMeasurementProjection(measurementFixtureData['limited-comparison'])
    expect(limited.measurements[0].result.state).toBe('measured')
    if (limited.measurements[0].result.state !== 'measured') throw new Error('expected measured baseline')
    expect(limited.measurements[0].result.observations[0].value).toBe(0)
    const pending = parseMeasurementProjection(measurementFixtureData['follow-up-not-due'])
    expect(pending.measurements[1].result.state).toBe('not_due')
  })

  it('does not permit machine-shaped directional outcomes without human outcome requirements', () => {
    const invalid = clone(measurementFixtureData['human-outcome']) as { outcomes: Record<string, unknown>[] }
    delete invalid.outcomes[0].rationale
    expect(() => parseMeasurementProjection(invalid)).toThrow('human rationale')
    const feature = parseMeasurementProjection(measurementFixtureData['human-outcome'])
    expect(feature.outcomes[0].direction).toBe('improved')
    expect(feature.outcomes[0].attribution.strength).toBe('none')

    const discontinuous = clone(measurementFixtureData['human-outcome']) as { measurements: { comparability: Record<string, unknown> }[] }
    discontinuous.measurements[1].comparability = { state: 'discontinuous', reason: 'Synthetic discontinuity.' }
    expect(() => parseMeasurementProjection(discontinuous)).toThrow('requires comparable linked measured records')

    const unmeasured = clone(measurementFixtureData['human-outcome']) as { cycle: Record<string, unknown>; measurements: { result: Record<string, unknown> }[] }
    delete unmeasured.cycle.measurementPlan
    unmeasured.measurements[1].result = { state: 'not_measured', reason: 'No observed follow-up.' }
    expect(() => parseMeasurementProjection(unmeasured)).toThrow('requires comparable linked measured records')

    const changedMethod = clone(measurementFixtureData['human-outcome']) as { measurements: { methodology: { id: string; version: string } }[] }
    changedMethod.measurements[1].methodology = { ...changedMethod.measurements[1].methodology, version: '2.0.0' }
    expect(() => parseMeasurementProjection(changedMethod)).toThrow('consistent methodology and chronology')

    const overlapping = clone(measurementFixtureData['human-outcome']) as { measurements: { result: { state: string; observedWindow?: { start: string; end: string } } }[] }
    overlapping.measurements[1].result.observedWindow = { start: '2026-10-02T00:00:00Z', end: '2026-10-25T23:59:59Z' }
    expect(() => parseMeasurementProjection(overlapping)).toThrow('consistent methodology and chronology')
  })
})
