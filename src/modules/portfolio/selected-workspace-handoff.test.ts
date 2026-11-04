import { describe, expect, it } from 'vitest'
import humanJson from '../../engine/fixtures/human-review.json'
import quietJson from '../../engine/fixtures/quiet.json'
import { loadPortfolioFixture } from '../../engine/portfolioFixtures'
import type { PortfolioEngagement } from '../../engine/portfolio-projection'
import { choosePortfolioEngagement } from './selection'
import { preflightSelectedWorkspaceHandoff } from './selected-workspace-handoff'

const portfolio = loadPortfolioFixture()
const entries = portfolio.portfolio.engagements
const alpha = entries.find((entry) => entry.engagementId === 'engagement-alpha')!
const beta = entries.find((entry) => entry.engagementId === 'engagement-beta')!
const noRun = entries.find((entry) => entry.currentRunState === 'no_current_run')!
const selectedAlpha = choosePortfolioEngagement(portfolio, alpha.engagementId)!
const selectedBeta = choosePortfolioEngagement(portfolio, beta.engagementId)!
const selectedNoRun = choosePortfolioEngagement(portfolio, noRun.engagementId)!

function matchingAlphaWorkspace() {
  const raw = structuredClone(humanJson)
  raw.source.workspaceId = alpha.workspaceId!
  raw.workspace.scope = { ...alpha.scope }
  raw.workspace.trustedTarget = alpha.trustedTarget
  return raw
}

function replaceAlpha(replacement?: PortfolioEngagement) {
  return { ...portfolio, portfolio: {
    ...portfolio.portfolio,
    engagements: entries.flatMap((entry) => entry.engagementId === alpha.engagementId
      ? (replacement ? [replacement] : []) : [entry]),
  } }
}

describe('selection-bound portfolio → workspace preflight', () => {
  it('requires explicit selection before examining even an otherwise matching workspace', () => {
    const raw = matchingAlphaWorkspace()
    expect(preflightSelectedWorkspaceHandoff(portfolio, undefined, raw)).toEqual({ status: 'no_explicit_selection' })
    expect(preflightSelectedWorkspaceHandoff(portfolio)).toEqual({ status: 'no_explicit_selection' })
  })

  it('rejects a stale snapshot or removed engagement before inspecting workspace bytes', () => {
    const changedId = { ...portfolio, portfolio: { ...portfolio.portfolio, id: 'portfolio-operations:new-snapshot' } }
    expect(preflightSelectedWorkspaceHandoff(changedId, selectedAlpha, matchingAlphaWorkspace()))
      .toEqual({ status: 'selection_expired' })
    expect(preflightSelectedWorkspaceHandoff(replaceAlpha(), selectedAlpha, null))
      .toEqual({ status: 'selection_expired' })
  })

  it('rejects re-scoped, re-targeted, re-run, or re-workspaced entries sharing an ID', () => {
    const changes: PortfolioEngagement[] = [
      { ...alpha, scope: { ...alpha.scope, tenantId: 'tenant-other' } },
      { ...alpha, scope: { ...alpha.scope, siteId: 'site-other' } },
      { ...alpha, scope: { ...alpha.scope, siteScopeRevisionId: 'scope-new' } },
      { ...alpha, trustedTarget: 'https://new.example.test' },
      { ...alpha, currentRunId: 'managed-service-run:new' },
      { ...alpha, workspaceId: 'workspace:new' },
    ]
    for (const changed of changes) {
      expect(preflightSelectedWorkspaceHandoff(replaceAlpha(changed), selectedAlpha, matchingAlphaWorkspace()))
        .toEqual({ status: 'selection_expired' })
    }
  })

  it('never treats an identical site ID in a second tenant as the same selected workspace', () => {
    expect(alpha.scope.siteId).toBe(beta.scope.siteId)
    expect(alpha.scope.tenantId).not.toBe(beta.scope.tenantId)
    expect(preflightSelectedWorkspaceHandoff(portfolio, selectedBeta, matchingAlphaWorkspace()))
      .toEqual({ status: 'scope_mismatch' })
  })

  it('preserves no-current-run, no supplied workspace, and invalid workspace as distinct states', () => {
    expect(preflightSelectedWorkspaceHandoff(portfolio, selectedNoRun, matchingAlphaWorkspace()))
      .toEqual({ status: 'no_current_run' })
    expect(preflightSelectedWorkspaceHandoff(portfolio, selectedAlpha))
      .toEqual({ status: 'workspace_not_supplied' })
    expect(preflightSelectedWorkspaceHandoff(portfolio, selectedAlpha, null))
      .toEqual({ status: 'invalid_workspace' })
  })

  it('delegates canonical matching, identity and Attention integrity without modifying source bytes', () => {
    const raw = matchingAlphaWorkspace()
    const before = structuredClone(raw)
    const result = preflightSelectedWorkspaceHandoff(portfolio, selectedAlpha, raw)
    expect(result.status).toBe('matched')
    if (result.status === 'matched') {
      expect(result.workspace.source.workspaceId).toBe(alpha.workspaceId)
      expect(result.workspace.workspace.scope.tenantId).toBe('tenant-alpha')
    }
    expect(raw).toEqual(before)

    const wrongAttention = structuredClone(quietJson)
    wrongAttention.source.workspaceId = alpha.workspaceId!
    wrongAttention.workspace.scope = { ...alpha.scope }
    wrongAttention.workspace.trustedTarget = alpha.trustedTarget
    expect(preflightSelectedWorkspaceHandoff(portfolio, selectedAlpha, wrongAttention))
      .toEqual({ status: 'attention_count_mismatch' })
  })
})
