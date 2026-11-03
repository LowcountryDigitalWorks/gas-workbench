import { describe, expect, it } from 'vitest'
import humanShellJson from './fixtures/human-review.json'
import outcomeShellJson from './fixtures/report-outcome.json'
import internalShellJson from './fixtures/report-internal.json'
import { decodeWorkbenchProjection } from './integrity'
import { decodeReportProjection, parseReportProjection } from './report-projection'
import { reportFixtureData, reportFixtureIds } from './reportFixtures'

const humanShell = decodeWorkbenchProjection(humanShellJson)
const outcomeShell = decodeWorkbenchProjection(outcomeShellJson)
const internalShell = decodeWorkbenchProjection(internalShellJson)
const clone = <T,>(value: T): T => structuredClone(value)
function shellFor(id: (typeof reportFixtureIds)[number]) {
  if (id === 'decision-outcome') return outcomeShell
  if (id === 'internal-appendix') return internalShell
  return humanShell
}

describe('Report feature projection boundary', () => {
  it('decodes all bounded Release 0.17 walkthroughs only against their producer-coherent shells', async () => {
    for (const id of reportFixtureIds) {
      const feature = await decodeReportProjection(reportFixtureData[id], shellFor(id))
      expect(feature.report.version).toBe('0.17.0')
      expect(feature.report.focusItems.length).toBeGreaterThanOrEqual(1)
      expect(feature.report.focusItems.length).toBeLessThanOrEqual(3)
    }
  })

  it('rejects wrong feature/report versions and unknown widening', () => {
    const wrongFeature = clone(reportFixtureData['focused-evidence']) as unknown as Record<string, unknown>
    wrongFeature.schemaMinorVersion = 1
    expect(() => parseReportProjection(wrongFeature)).toThrow('Unsupported report feature')
    const wrongReport = clone(reportFixtureData['focused-evidence']) as unknown as { report: Record<string, unknown> }
    wrongReport.report.version = '0.18.0'
    expect(() => parseReportProjection(wrongReport)).toThrow('must remain 0.17.0')
    const widened = clone(reportFixtureData['focused-evidence']) as unknown as Record<string, unknown>
    widened.futureField = true
    expect(() => parseReportProjection(widened)).toThrow('not supported')
  })

  it('fails closed on shell/site/target/source binding drift', async () => {
    const mismatch = clone(humanShellJson) as unknown as { workspace: { scope: { siteScopeRevisionId: string } } }
    mismatch.workspace.scope.siteScopeRevisionId = 'scope-revision:other'
    await expect(decodeReportProjection(reportFixtureData['focused-evidence'], decodeWorkbenchProjection(mismatch))).rejects.toThrow('identities do not match')
    const target = clone(reportFixtureData['focused-evidence']) as unknown as { report: { context: { target: string } } }
    target.report.context.target = 'https://other.example'
    await expect(decodeReportProjection(target, humanShell)).rejects.toThrow('site/target')
    const periods = clone(reportFixtureData['focused-evidence']) as unknown as { report: { context: { periods: { start: string; end: string }[] } } }
    periods.report.context.periods = [{ start: '2026-09-01', end: '2026-09-30' }]
    await expect(decodeReportProjection(periods, humanShell)).rejects.toThrow('context periods')
  })

  it('preserves the Release 0.17 primary-focus bound and rejects duplicate focus identities', () => {
    const tooMany = clone(reportFixtureData['focused-evidence']) as unknown as { report: { focusItems: Record<string, unknown>[] } }
    const item = structuredClone(tooMany.report.focusItems[0])
    tooMany.report.focusItems.push({ ...item, label: 'second' }, { ...item, label: 'third' }, { ...item, label: 'fourth' })
    expect(() => parseReportProjection(tooMany)).toThrow('1-3 selected primary focus')
    const duplicate = clone(reportFixtureData['focused-evidence']) as unknown as { report: { focusItems: Record<string, unknown>[] } }
    duplicate.report.focusItems.push(structuredClone(duplicate.report.focusItems[0]))
    expect(() => parseReportProjection(duplicate)).toThrow('duplicate identities')
  })

  it('binds report readiness and source notes to the current shell without ranking them', async () => {
    const readiness = clone(reportFixtureData['focused-evidence']) as unknown as { report: { readiness: { moduleId: string; state: string }[] } }
    readiness.report.readiness.find((item) => item.moduleId === 'page_focus')!.state = 'limited'
    await expect(decodeReportProjection(readiness, humanShell)).rejects.toThrow('stale or mismatched')
    const source = clone(reportFixtureData['focused-evidence']) as unknown as { report: { sourceNotes: { moduleId: string; release: string }[] } }
    source.report.sourceNotes[0].release = '9.99'
    await expect(decodeReportProjection(source, humanShell)).rejects.toThrow('source note')
  })

  it('binds customer-safe focus identity including the exact Release 0.17 label', async () => {
    const wrongKind = clone(reportFixtureData['focused-evidence']) as unknown as { report: { focusItems: { kind: string }[] } }
    wrongKind.report.focusItems[0].kind = 'invented_kind'
    await expect(decodeReportProjection(wrongKind, humanShell)).rejects.toThrow('Attention evidence')
    const wrongLabel = clone(reportFixtureData['focused-evidence']) as unknown as { report: { focusItems: { label: string }[] } }
    wrongLabel.report.focusItems[0].label = 'https://other.example/not-the-selected-evidence'
    await expect(decodeReportProjection(wrongLabel, humanShell)).rejects.toThrow('customer-safe label')
  })

  it('binds decision readiness and recorded measurement/outcome counts to the matched shell', async () => {
    await expect(decodeReportProjection(reportFixtureData['decision-outcome'], humanShell)).rejects.toThrow('identities do not match')
    const wrongDecision = clone(reportFixtureData['focused-evidence']) as unknown as { report: { decision: { disposition: string; summary: string } } }
    wrongDecision.report.decision.disposition = 'recommend'
    wrongDecision.report.decision.summary = 'Different human decision'
    await expect(decodeReportProjection(wrongDecision, humanShell)).rejects.toThrow('decision summary')
    const wrongCounts = clone(reportFixtureData['focused-evidence']) as unknown as { report: { decision: { recordedMeasurementCount: number } } }
    wrongCounts.report.decision.recordedMeasurementCount = 1
    await expect(decodeReportProjection(wrongCounts, humanShell)).rejects.toThrow('measurement/outcome counts')
    expect((await decodeReportProjection(reportFixtureData['decision-outcome'], outcomeShell)).report.decision?.humanOutcomes).toHaveLength(1)
    const wrongOutcomeDirection = clone(reportFixtureData['decision-outcome']) as unknown as { report: { decision: { humanOutcomes: { direction: string }[] } } }
    wrongOutcomeDirection.report.decision.humanOutcomes[0].direction = 'regressed'
    await expect(decodeReportProjection(wrongOutcomeDirection, outcomeShell)).rejects.toThrow('outcome direction/time')
    const wrongOutcomeTime = clone(reportFixtureData['decision-outcome']) as unknown as { report: { decision: { humanOutcomes: { createdAt: string }[] } } }
    wrongOutcomeTime.report.decision.humanOutcomes[0].createdAt = '2026-11-13T00:21:00Z'
    await expect(decodeReportProjection(wrongOutcomeTime, outcomeShell)).rejects.toThrow('outcome direction/time')
  })

  it('keeps the internal appendix optional, bounded, and bound to verifiable current source references', async () => {
    const quiet = await decodeReportProjection(reportFixtureData['quiet-report'], humanShell)
    expect(quiet.report.internalAppendix).toBeUndefined()
    const missing = clone(reportFixtureData['internal-appendix']) as unknown as { report: { internalAppendix: { selectedAttentionIds: string[] } } }
    missing.report.internalAppendix.selectedAttentionIds[0] = 'attention:missing'
    await expect(decodeReportProjection(missing, internalShell)).rejects.toThrow('absent Attention id')
    const staleBrief = clone(reportFixtureData['internal-appendix']) as unknown as { report: { internalAppendix: { serviceBriefId: string } } }
    staleBrief.report.internalAppendix.serviceBriefId = 'service-brief:stale'
    await expect(decodeReportProjection(staleBrief, internalShell)).rejects.toThrow('serviceBriefId')
    const unverifiableDossier = clone(reportFixtureData['internal-appendix']) as unknown as { report: { internalAppendix: Record<string, unknown> } }
    unverifiableDossier.report.internalAppendix.decisionCycleDossierId = 'decision-cycle:unverifiable'
    await expect(decodeReportProjection(unverifiableDossier, internalShell)).rejects.toThrow('not verifiable')
    const count = clone(reportFixtureData['internal-appendix']) as unknown as { report: { internalAppendix: { selectedAttentionIds: string[] } } }
    count.report.internalAppendix.selectedAttentionIds = []
    expect(() => parseReportProjection(count)).toThrow('one-for-one')
  })

  it('verifies the Release 0.17 canonical content hash instead of accepting hash-shaped IDs', async () => {
    for (const id of reportFixtureIds) await expect(decodeReportProjection(reportFixtureData[id], shellFor(id))).resolves.toBeDefined()
    const tampered = clone(reportFixtureData['focused-evidence']) as unknown as { report: { executiveSummary: string } }
    tampered.report.executiveSummary = 'Tampered after report identity was created.'
    await expect(decodeReportProjection(tampered, humanShell)).rejects.toThrow('canonical content hash')
  })

  it('preserves supplied observed-change text instead of deriving metric claims', () => {
    const feature = parseReportProjection(reportFixtureData['focused-evidence'])
    expect(feature.report.observedChanges).toEqual(['Human reviewer noted that the services page is the selected evidence focus for separate validation.'])
    expect(parseReportProjection(reportFixtureData['quiet-report']).report.observedChanges).toEqual([])
  })

  it('keeps human outcome direction and attribution vocabularies strict', () => {
    const feature = parseReportProjection(reportFixtureData['decision-outcome'])
    expect(feature.report.decision?.humanOutcomes[0]).toMatchObject({ direction: 'improved', attribution: 'none' })
    const invalid = clone(reportFixtureData['decision-outcome']) as unknown as { report: { decision: { humanOutcomes: { direction: string }[] } } }
    invalid.report.decision.humanOutcomes[0].direction = 'machine_inferred_win'
    expect(() => parseReportProjection(invalid)).toThrow('unsupported value')
  })

  it('allows optional decision and appendix to be absent structurally without treating absence as parse failure', () => {
    const withoutDecision = clone(reportFixtureData['quiet-report']) as unknown as { report: Record<string, unknown> }
    delete withoutDecision.report.decision
    const parsed = parseReportProjection(withoutDecision)
    expect(parsed.report.decision).toBeUndefined()
    expect(parsed.report.internalAppendix).toBeUndefined()
  })

  it('requires recommendation lifecycle and rationale to travel together', () => {
    const invalid = clone(reportFixtureData['decision-outcome']) as unknown as { report: { decision: Record<string, unknown> } }
    delete invalid.report.decision.recommendationRationale
    expect(() => parseReportProjection(invalid)).toThrow('supplied together')
  })
})
