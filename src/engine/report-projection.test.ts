import { describe, expect, it } from 'vitest'
import shellJson from './fixtures/human-review.json'
import { decodeWorkbenchProjection } from './integrity'
import { decodeReportProjection, parseReportProjection } from './report-projection'
import { reportFixtureData, reportFixtureIds } from './reportFixtures'

const shell = decodeWorkbenchProjection(shellJson)
const clone = <T,>(value: T): T => structuredClone(value)

describe('Report feature projection boundary', () => {
  it('decodes all bounded Release 0.17 walkthroughs against the matched shell', () => {
    for (const id of reportFixtureIds) {
      const feature = decodeReportProjection(reportFixtureData[id], shell)
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

  it('fails closed on shell/site/target/source binding drift', () => {
    const mismatch = clone(shellJson) as unknown as { workspace: { scope: { siteScopeRevisionId: string } } }
    mismatch.workspace.scope.siteScopeRevisionId = 'scope-revision:other'
    expect(() => decodeReportProjection(reportFixtureData['focused-evidence'], decodeWorkbenchProjection(mismatch))).toThrow('identities do not match')
    const target = clone(reportFixtureData['focused-evidence']) as unknown as { report: { context: { target: string } } }
    target.report.context.target = 'https://other.example'
    expect(() => decodeReportProjection(target, shell)).toThrow('site/target')
    const periods = clone(reportFixtureData['focused-evidence']) as unknown as { report: { context: { periods: { start: string; end: string }[] } } }
    periods.report.context.periods = [{ start: '2026-09-01', end: '2026-09-30' }]
    expect(() => decodeReportProjection(periods, shell)).toThrow('context periods')
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

  it('binds report readiness and source notes to the current shell without ranking them', () => {
    const readiness = clone(reportFixtureData['focused-evidence']) as unknown as { report: { readiness: { moduleId: string; state: string }[] } }
    readiness.report.readiness.find((item) => item.moduleId === 'page_focus')!.state = 'limited'
    expect(() => decodeReportProjection(readiness, shell)).toThrow('stale or mismatched')
    const source = clone(reportFixtureData['focused-evidence']) as unknown as { report: { sourceNotes: { moduleId: string; release: string }[] } }
    source.report.sourceNotes[0].release = '9.99'
    expect(() => decodeReportProjection(source, shell)).toThrow('source note')
  })

  it('requires customer-safe focus items to resolve to supplied Attention evidence', () => {
    const invalid = clone(reportFixtureData['focused-evidence']) as unknown as { report: { focusItems: { kind: string }[] } }
    invalid.report.focusItems[0].kind = 'invented_kind'
    expect(() => decodeReportProjection(invalid, shell)).toThrow('Attention evidence')
  })

  it('keeps the internal appendix optional, bounded, and correlated to focus selection', () => {
    const quiet = decodeReportProjection(reportFixtureData['quiet-report'], shell)
    expect(quiet.report.internalAppendix).toBeUndefined()
    const missing = clone(reportFixtureData['internal-appendix']) as unknown as { report: { internalAppendix: { selectedAttentionIds: string[] } } }
    missing.report.internalAppendix.selectedAttentionIds[0] = 'attention:missing'
    expect(() => decodeReportProjection(missing, shell)).toThrow('absent Attention id')
    const count = clone(reportFixtureData['internal-appendix']) as unknown as { report: { internalAppendix: { selectedAttentionIds: string[] } } }
    count.report.internalAppendix.selectedAttentionIds = []
    expect(() => parseReportProjection(count)).toThrow('one-for-one')
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

  it('allows optional decision and appendix to be absent without treating absence as failure', () => {
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
