import { describe, expect, it } from 'vitest'
import { mixedPortfolioFixture } from './portfolioFixtures'
import { parsePortfolioProjection } from './portfolio-projection'

const clone = <T,>(value: T): T => structuredClone(value)

type MutableFixture = { schemaMinorVersion: number; portfolio: Record<string, unknown> & { version: string; classification: string; id: string; engagements: Array<Record<string, unknown> & { engagementId: string; scope: Record<string, unknown>; sources: Array<Record<string, unknown> & { freshness: Record<string, unknown> }>; exceptions: Array<Record<string, unknown> & { kind: string }>; attentionCount: number }>; summary: { currentRun: { present: number }; sourceStates: Array<{ count: number }>; exceptionKinds: Array<{ count: number }> } } }

describe('portfolio projection', () => {
  it('accepts bounded Release 0.19 operational state with cross-tenant site isolation', () => {
    const feature = parsePortfolioProjection(mixedPortfolioFixture)
    expect(feature.portfolio.classification).toBe('ldw_internal')
    expect(feature.portfolio.summary).toMatchObject({ engagementCount: 3, currentRun: { present: 2, noCurrentRun: 1 }, attentionPresentEngagements: 1 })
    expect(feature.portfolio.engagements[0]?.scope.siteId).toBe(feature.portfolio.engagements[1]?.scope.siteId)
    expect(feature.portfolio.engagements[0]?.scope.tenantId).not.toBe(feature.portfolio.engagements[1]?.scope.tenantId)
    expect(feature.portfolio.engagements[2]?.currentRunState).toBe('no_current_run')
  })

  it('rejects schema, engine version, classification, identity, and unknown widening', () => {
    for (const mutate of [
      (x: MutableFixture) => { x.schemaMinorVersion = 1 },
      (x: MutableFixture) => { x.portfolio.version = '0.19.1' },
      (x: MutableFixture) => { x.portfolio.classification = 'customer_safe' },
      (x: MutableFixture) => { x.portfolio.id = 'portfolio-operations:not-a-hash' },
      (x: MutableFixture) => { x.portfolio.ranking = [] },
    ]) {
      const candidate = clone(mixedPortfolioFixture) as unknown as MutableFixture
      mutate(candidate)
      expect(() => parsePortfolioProjection(candidate)).toThrow()
    }
  })

  it('rejects duplicate inventory identity while allowing the same site ID under different tenants', () => {
    const duplicateId = clone(mixedPortfolioFixture) as unknown as MutableFixture
    duplicateId.portfolio.engagements[1].engagementId = duplicateId.portfolio.engagements[0].engagementId
    expect(() => parsePortfolioProjection(duplicateId)).toThrow('duplicate identities')

    const duplicateScope = clone(mixedPortfolioFixture) as unknown as MutableFixture
    duplicateScope.portfolio.engagements[1].scope = clone(duplicateScope.portfolio.engagements[0].scope)
    expect(() => parsePortfolioProjection(duplicateScope)).toThrow('duplicate identities')
  })

  it('keeps no-current-run distinct from healthy or zero run-derived evidence', () => {
    const candidate = clone(mixedPortfolioFixture) as unknown as MutableFixture
    const noRun = candidate.portfolio.engagements[2]
    noRun.currentRunId = `managed-service-run:${'9'.repeat(64)}`
    expect(() => parsePortfolioProjection(candidate)).toThrow('no_current_run cannot carry run-only fields')

    const nonEmpty = clone(mixedPortfolioFixture) as unknown as MutableFixture
    nonEmpty.portfolio.engagements[2].attentionCount = 1
    expect(() => parsePortfolioProjection(nonEmpty)).toThrow('no_current_run must preserve empty run-derived state')
  })

  it('preserves source state separately from operational freshness', () => {
    const unavailableAsStale = clone(mixedPortfolioFixture) as unknown as MutableFixture
    unavailableAsStale.portfolio.engagements[1].sources[4].freshness = {
      state: 'stale', anchorKind: 'received_at', anchorAt: '2026-10-01T00:00:00.000Z', ageSeconds: 300000, maxAgeSeconds: 7200,
    }
    expect(() => parsePortfolioProjection(unavailableAsStale)).toThrow('valid only for supplied source state')

    const falseFresh = clone(mixedPortfolioFixture) as unknown as MutableFixture
    falseFresh.portfolio.engagements[0].sources[0].freshness.ageSeconds = 9000
    expect(() => parsePortfolioProjection(falseFresh)).toThrow('contradicts supplied age/policy values')

    const falseReason = clone(mixedPortfolioFixture) as unknown as MutableFixture
    falseReason.portfolio.engagements[0].sources[2].freshness.reason = 'source_state_not_evaluable'
    expect(() => parsePortfolioProjection(falseReason)).toThrow('supplied source cannot use source_state_not_evaluable')
  })

  it('rejects invented or stale factual exceptions and dangling source references', () => {
    const missing = clone(mixedPortfolioFixture) as unknown as MutableFixture
    missing.portfolio.engagements[1].exceptions = missing.portfolio.engagements[1].exceptions.filter((entry: { kind: string }) => entry.kind !== 'source_stale')
    expect(() => parsePortfolioProjection(missing)).toThrow('exceptions contradict')

    const invented = clone(mixedPortfolioFixture) as unknown as MutableFixture
    invented.portfolio.engagements[0].exceptions[0].kind = 'high_priority'
    expect(() => parsePortfolioProjection(invented)).toThrow('unsupported value')
  })

  it('reconciles every operational summary family against engagement state', () => {
    const currentRun = clone(mixedPortfolioFixture) as unknown as MutableFixture
    currentRun.portfolio.summary.currentRun.present = 3
    expect(() => parsePortfolioProjection(currentRun)).toThrow('current-run summary')

    const source = clone(mixedPortfolioFixture) as unknown as MutableFixture
    source.portfolio.summary.sourceStates[0].count = 6
    expect(() => parsePortfolioProjection(source)).toThrow('sourceStates count')

    const exception = clone(mixedPortfolioFixture) as unknown as MutableFixture
    exception.portfolio.summary.exceptionKinds[5].count = 0
    expect(() => parsePortfolioProjection(exception)).toThrow('exceptionKinds count')
  })

  it('preserves report-not-requested as factual state rather than failure', () => {
    const feature = parsePortfolioProjection(mixedPortfolioFixture)
    const beta = feature.portfolio.engagements.find((entry) => entry.engagementId === 'engagement-beta')
    expect(beta?.report).toEqual({ state: 'not_requested' })
    expect(beta?.exceptions.some((entry) => entry.kind === 'report_not_requested')).toBe(true)
  })
})
