import { describe, expect, it } from 'vitest'
import { loadPortfolioFixture } from '../../engine/portfolioFixtures'
import { choosePortfolioEngagement } from './selection'
import { changePortfolioFilter, clearPortfolioSelection, filterPortfolioEngagements, resolveVisiblePortfolioEngagement, PORTFOLIO_FILTERS } from './filter'

const projection = loadPortfolioFixture()
const engagements = projection.portfolio.engagements
const ids = (filter: Parameters<typeof filterPortfolioEngagements>[1]) =>
  filterPortfolioEngagements(engagements, filter).map((entry) => entry.engagementId)

describe('factual portfolio triage filters', () => {
  it('exposes a fixed operator-controlled filter vocabulary with no rank/health state', () => {
    expect(PORTFOLIO_FILTERS.map((entry) => entry.id)).toEqual([
      'all', 'no-current-run', 'attention-present', 'source-exceptions',
    ])
  })

  it('filters only accepted Release 0.19 facts in original trusted inventory order', () => {
    expect(ids('all')).toEqual(['engagement-alpha', 'engagement-beta', 'engagement-no-current-run'])
    expect(ids('no-current-run')).toEqual(['engagement-no-current-run'])
    expect(ids('attention-present')).toEqual(['engagement-alpha'])
    expect(ids('source-exceptions')).toEqual(['engagement-alpha', 'engagement-beta'])
    expect(filterPortfolioEngagements([], 'all')).toEqual([])
    expect(filterPortfolioEngagements([], 'source-exceptions')).toEqual([])
    expect(ids('all')).toEqual(engagements.map((entry) => entry.engagementId))
  })

  it('atomically discards explicit selection when changing factual filters', () => {
    const selection = choosePortfolioEngagement(projection, 'engagement-alpha')!
    const initial = { filter: 'all' as const, selection }
    const changed = changePortfolioFilter(initial, 'no-current-run')
    expect(changed).toEqual({ filter: 'no-current-run' })
    expect(changed.selection).toBeUndefined()
    expect(resolveVisiblePortfolioEngagement(projection, changed.selection, changed.filter)).toBeUndefined()
    expect(changePortfolioFilter(initial, 'all')).toBe(initial)
    expect(initial.selection).toBe(selection)
  })

  it('never substitutes a hidden row, a different tenant with the same site ID, or a first-row default', () => {
    const alpha = choosePortfolioEngagement(projection, 'engagement-alpha')
    const beta = choosePortfolioEngagement(projection, 'engagement-beta')
    const noRun = choosePortfolioEngagement(projection, 'engagement-no-current-run')
    expect(resolveVisiblePortfolioEngagement(projection, undefined, 'all')).toBeUndefined()
    expect(resolveVisiblePortfolioEngagement(projection, alpha, 'no-current-run')).toBeUndefined()
    expect(resolveVisiblePortfolioEngagement(projection, beta, 'attention-present')).toBeUndefined()
    expect(resolveVisiblePortfolioEngagement(projection, alpha, 'attention-present')?.scope.tenantId).toBe('tenant-alpha')
    expect(resolveVisiblePortfolioEngagement(projection, beta, 'source-exceptions')?.scope.tenantId).toBe('tenant-beta')
    expect(resolveVisiblePortfolioEngagement(projection, noRun, 'no-current-run')?.currentRunState).toBe('no_current_run')
  })

  it('invalidates the selection when trusted portfolio identity or engagement scope changes', () => {
    const alpha = choosePortfolioEngagement(projection, 'engagement-alpha')
    const changedPortfolio = { ...projection, portfolio: { ...projection.portfolio, id: 'portfolio-operations:other' } }
    const changedScope = { ...projection, portfolio: {
      ...projection.portfolio,
      engagements: engagements.map((entry) => entry.engagementId !== 'engagement-alpha'
        ? entry : { ...entry, scope: { ...entry.scope, tenantId: 'tenant-other' } }),
    } }
    expect(resolveVisiblePortfolioEngagement(changedPortfolio, alpha, 'all')).toBeUndefined()
    expect(resolveVisiblePortfolioEngagement(changedScope, alpha, 'all')).toBeUndefined()
  })
  it('clears an explicit tenant choice while preserving the factual filter and other inventory', () => {
    for (const engagementId of ['engagement-alpha', 'engagement-no-current-run']) {
      const selection = choosePortfolioEngagement(projection, engagementId)!
      const previous = { filter: 'all' as const, selection }
      const cleared = clearPortfolioSelection(previous)
      expect(cleared).toEqual({ filter: 'all' })
      expect(cleared.selection).toBeUndefined()
      expect(clearPortfolioSelection(cleared)).toBe(cleared)
      expect(resolveVisiblePortfolioEngagement(projection, cleared.selection, cleared.filter)).toBeUndefined()
      expect(previous.selection).toBe(selection)
    }
    const selected = { filter: 'attention-present' as const, selection: choosePortfolioEngagement(projection, 'engagement-alpha')! }
    expect(clearPortfolioSelection(selected)).toEqual({ filter: 'attention-present' })
    expect(ids('attention-present')).toEqual(['engagement-alpha'])
  })

})
