import { decodeWorkbenchProjection } from './integrity'
import type { PortfolioFeatureProjection } from './portfolio-projection'
import type { WorkbenchProjection } from './projection'

/**
 * A presentation-level preflight only. The caller must obtain a canonical
 * portfolio from trusted inventory and independently authorize any runtime
 * evidence access. An ID match never grants tenant or provider authority.
 */
export type PortfolioWorkspaceHandoffStatus =
  | 'not_in_inventory'
  | 'no_current_run'
  | 'workspace_not_supplied'
  | 'invalid_workspace'
  | 'scope_mismatch'
  | 'target_mismatch'
  | 'workspace_id_mismatch'
  | 'attention_count_mismatch'
  | 'matched'

export type PortfolioWorkspaceHandoff =
  | Readonly<{ status: Exclude<PortfolioWorkspaceHandoffStatus, 'matched'> }>
  | Readonly<{ status: 'matched'; workspace: WorkbenchProjection }>

/**
 * Rejects cross-tenant, cross-revision, cross-target, and stale workspace
 * associations before an operator UI could navigate between accepted views.
 * This deliberately does not fetch artifacts, choose a tenant, or create a run.
 */
export function preflightPortfolioWorkspaceHandoff(
  portfolio: PortfolioFeatureProjection,
  engagementId: string,
  suppliedWorkspace?: unknown,
): PortfolioWorkspaceHandoff {
  const engagement = portfolio.portfolio.engagements.find(
    (entry) => entry.engagementId === engagementId,
  )
  if (!engagement) return { status: 'not_in_inventory' }
  if (engagement.currentRunState !== 'present' || !engagement.workspaceId) {
    return { status: 'no_current_run' }
  }
  if (suppliedWorkspace === undefined) return { status: 'workspace_not_supplied' }

  let workspace: WorkbenchProjection
  try {
    workspace = decodeWorkbenchProjection(suppliedWorkspace)
  } catch {
    return { status: 'invalid_workspace' }
  }

  const requiredScope = engagement.scope
  const suppliedScope = workspace.workspace.scope
  if (
    requiredScope.tenantId !== suppliedScope.tenantId
    || requiredScope.siteId !== suppliedScope.siteId
    || requiredScope.siteScopeRevisionId !== suppliedScope.siteScopeRevisionId
  ) {
    return { status: 'scope_mismatch' }
  }
  if (engagement.trustedTarget !== workspace.workspace.trustedTarget) {
    return { status: 'target_mismatch' }
  }
  if (engagement.workspaceId !== workspace.source.workspaceId) {
    return { status: 'workspace_id_mismatch' }
  }
  if (engagement.attentionCount !== workspace.workspace.attention.length) {
    return { status: 'attention_count_mismatch' }
  }
  return { status: 'matched', workspace }
}