import { describe, expect, it } from 'vitest'
import humanJson from './fixtures/human-review.json'
import quietJson from './fixtures/quiet.json'
import { loadPortfolioFixture } from './portfolioFixtures'
import { preflightPortfolioWorkspaceHandoff } from './portfolio-workspace-preflight'

const portfolio = loadPortfolioFixture()
const alpha = portfolio.portfolio.engagements.find((row) => row.engagementId === 'engagement-alpha')!
const beta = portfolio.portfolio.engagements.find((row) => row.engagementId === 'engagement-beta')!
const noRun = portfolio.portfolio.engagements.find((row) => row.currentRunState === 'no_current_run')!

function withAlphaIdentity<T extends typeof humanJson | typeof quietJson>(value: T): T {
  const shell = structuredClone(value)
  shell.source.workspaceId = alpha.workspaceId!
  shell.workspace.scope = { ...alpha.scope }
  shell.workspace.trustedTarget = alpha.trustedTarget
  return shell
}
const matchingShell = () => withAlphaIdentity(humanJson)

describe('portfolio-to-workspace identity preflight', () => {
  it('accepts only an exactly bound, canonically decoded synthetic workspace without mutating it', () => {
    const raw = matchingShell()
    const unchanged = structuredClone(raw)
    const result = preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, raw)
    expect(result.status).toBe('matched')
    if (result.status === 'matched') {
      expect(result.workspace.source.workspaceId).toBe(alpha.workspaceId)
      expect(result.workspace.workspace.scope).toEqual(alpha.scope)
      expect(result.workspace.workspace.trustedTarget).toBe(alpha.trustedTarget)
      expect(result.workspace.workspace.attention).toHaveLength(alpha.attentionCount)
    }
    expect(raw).toEqual(unchanged)
    expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, raw)).toEqual(result)
  })

  it('never treats the same site ID across two tenants as the same engagement', () => {
    expect(alpha.scope.siteId).toBe(beta.scope.siteId)
    expect(alpha.scope.tenantId).not.toBe(beta.scope.tenantId)
    expect(preflightPortfolioWorkspaceHandoff(portfolio, beta.engagementId, matchingShell())).toEqual({ status: 'scope_mismatch' })
  })

  it('rejects tenant, site, scope revision, target and workspace ID mismatches independently', () => {
    const cases = [
      { change: (x: ReturnType<typeof matchingShell>) => { x.workspace.scope.tenantId = 'tenant-other' }, status: 'scope_mismatch' },
      { change: (x: ReturnType<typeof matchingShell>) => { x.workspace.scope.siteId = 'site-other' }, status: 'scope_mismatch' },
      { change: (x: ReturnType<typeof matchingShell>) => { x.workspace.scope.siteScopeRevisionId = 'scope-other' }, status: 'scope_mismatch' },
      { change: (x: ReturnType<typeof matchingShell>) => { x.workspace.trustedTarget = 'https://other.example.test' }, status: 'target_mismatch' },
      { change: (x: ReturnType<typeof matchingShell>) => { x.source.workspaceId = 'workspace:wrong' }, status: 'workspace_id_mismatch' },
    ] as const
    for (const item of cases) {
      const raw = matchingShell()
      item.change(raw)
      expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, raw)).toEqual({ status: item.status })
    }
  })

  it('blocks a structurally valid zero-Attention workspace for a one-Attention current run', () => {
    const other = withAlphaIdentity(quietJson)
    expect(alpha.attentionCount).toBe(1)
    expect(other.workspace.attention).toHaveLength(0)
    expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, other)).toEqual({ status: 'attention_count_mismatch' })
  })

  it('keeps no current run, unknown inventory, absent and null workspace distinct', () => {
    expect(preflightPortfolioWorkspaceHandoff(portfolio, noRun.engagementId, matchingShell())).toEqual({ status: 'no_current_run' })
    expect(preflightPortfolioWorkspaceHandoff(portfolio, 'engagement-unknown', matchingShell())).toEqual({ status: 'not_in_inventory' })
    expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId)).toEqual({ status: 'workspace_not_supplied' })
    expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, null)).toEqual({ status: 'invalid_workspace' })
  })

  it('rejects incompatible, incomplete or contradictory workspace data', () => {
    const wrongVersion = matchingShell()
    wrongVersion.schemaMinorVersion = 42
    expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, wrongVersion)).toEqual({ status: 'invalid_workspace' })
    expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, { source: { workspaceId: alpha.workspaceId } })).toEqual({ status: 'invalid_workspace' })
    const contradictory = matchingShell()
    contradictory.workspace.navigation.overview.attentionCount = 2
    expect(preflightPortfolioWorkspaceHandoff(portfolio, alpha.engagementId, contradictory)).toEqual({ status: 'invalid_workspace' })
  })
})