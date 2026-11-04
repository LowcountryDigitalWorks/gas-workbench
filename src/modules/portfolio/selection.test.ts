import { describe, expect, it } from 'vitest'
import { loadPortfolioFixture } from '../../engine/portfolioFixtures'
import type { PortfolioFeatureProjection } from '../../engine/portfolio-projection'
import { choosePortfolioEngagement, resolvePortfolioEngagement } from './selection'

const projection = loadPortfolioFixture()
const portfolio = projection.portfolio
const alpha = portfolio.engagements.find((e) => e.engagementId === 'engagement-alpha')!
const beta = portfolio.engagements.find((e) => e.engagementId === 'engagement-beta')!
const noRun = portfolio.engagements.find((e) => e.currentRunState === 'no_current_run')!

function withEngagements(engagements: PortfolioFeatureProjection['portfolio']['engagements']) {
  return { ...projection, portfolio: { ...portfolio, engagements } }
}

describe('explicit portfolio selection identity', () => {
  it('never infers a default tenant or falls back on an unknown selection', () => {
    expect(resolvePortfolioEngagement(projection)).toBeUndefined()
    expect(choosePortfolioEngagement(projection, 'unknown')).toBeUndefined()
    expect(resolvePortfolioEngagement(projection, choosePortfolioEngagement(projection, 'unknown'))).toBeUndefined()
  })

  it('preserves explicit same-snapshot selection despite reorder, not first-in-list order', () => {
    const chosen = choosePortfolioEngagement(projection, alpha.engagementId)
    expect(resolvePortfolioEngagement(projection, chosen)).toEqual(alpha)
    const reversed = withEngagements([...portfolio.engagements].reverse())
    expect(resolvePortfolioEngagement(reversed, chosen)).toEqual(alpha)
    expect(reversed.portfolio.engagements[0]?.engagementId).not.toBe(alpha.engagementId)
  })

  it('does not confuse two tenants with identical site IDs', () => {
    expect(alpha.scope.siteId).toBe(beta.scope.siteId)
    expect(alpha.scope.tenantId).not.toBe(beta.scope.tenantId)
    const selectedAlpha = choosePortfolioEngagement(projection, alpha.engagementId)!
    const selectedBeta = choosePortfolioEngagement(projection, beta.engagementId)!
    expect(resolvePortfolioEngagement(projection, selectedAlpha)?.scope.tenantId).toBe('tenant-alpha')
    expect(resolvePortfolioEngagement(projection, selectedBeta)?.scope.tenantId).toBe('tenant-beta')
    const betaOnly = withEngagements([beta])
    expect(resolvePortfolioEngagement(betaOnly, selectedAlpha)).toBeUndefined()
    expect(resolvePortfolioEngagement(betaOnly, selectedBeta)).toEqual(beta)
  })

  it('invalidates selection if portfolio identity changes, even with the same engagement ID', () => {
    const chosen = choosePortfolioEngagement(projection, alpha.engagementId)!
    const changed = { ...projection, portfolio: { ...portfolio, id: ('portfolio-operations:' + 'b'.repeat(64)) as typeof portfolio.id } }
    expect(resolvePortfolioEngagement(changed, chosen)).toBeUndefined()
    expect(resolvePortfolioEngagement(changed, choosePortfolioEngagement(changed, alpha.engagementId))).toEqual(alpha)
  })

  it('fails closed on removed, re-scoped, re-targeted, or replaced-current-run engagements', () => {
    const chosen = choosePortfolioEngagement(projection, alpha.engagementId)!
    const changed = [
      { ...alpha, scope: { ...alpha.scope, tenantId: 'tenant-other' } },
      { ...alpha, scope: { ...alpha.scope, siteScopeRevisionId: 'scope-r99' } },
      { ...alpha, trustedTarget: 'https://new.example.test' },
      { ...alpha, workspaceId: 'workspace:other' },
      { ...alpha, currentRunId: 'managed-service-run:other' },
    ]
    expect(resolvePortfolioEngagement(withEngagements(portfolio.engagements.filter(e => e.engagementId !== alpha.engagementId)), chosen)).toBeUndefined()
    for (const entry of changed) {
      const modified = withEngagements(portfolio.engagements.map(e => e.engagementId === alpha.engagementId ? entry : e))
      expect(resolvePortfolioEngagement(modified, chosen)).toBeUndefined()
    }
  })

  it('allows an explicit no-current-run inventory entry without inventing evidence', () => {
    const chosen = choosePortfolioEngagement(projection, noRun.engagementId)
    expect(resolvePortfolioEngagement(projection, chosen)).toEqual(noRun)
    expect(resolvePortfolioEngagement(projection, chosen)?.currentRunState).toBe('no_current_run')
  })
})