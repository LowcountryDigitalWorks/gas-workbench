import type { PortfolioEngagement, PortfolioFeatureProjection } from '../../engine/portfolio-projection'

/**
 * Binds an explicit operator choice to one supplied portfolio snapshot and
 * its exact trusted engagement identity. It never grants tenant authority.
 */
export interface PortfolioSelection {
  readonly portfolioId: string
  readonly engagementId: string
  readonly tenantId: string
  readonly siteId: string
  readonly siteScopeRevisionId: string
  readonly trustedTarget: string
  readonly currentRunId?: string
  readonly workspaceId?: string
}

export function choosePortfolioEngagement(
  projection: PortfolioFeatureProjection,
  engagementId: string,
): PortfolioSelection | undefined {
  const engagement = projection.portfolio.engagements.find((entry) => entry.engagementId === engagementId)
  if (!engagement) return undefined
  return {
    portfolioId: projection.portfolio.id,
    engagementId: engagement.engagementId,
    ...engagement.scope,
    trustedTarget: engagement.trustedTarget,
    ...(engagement.currentRunId === undefined ? {} : { currentRunId: engagement.currentRunId }),
    ...(engagement.workspaceId === undefined ? {} : { workspaceId: engagement.workspaceId }),
  }
}

/**
 * Never fall back to the first engagement if a selected item disappears,
 * becomes another tenant/scope, or the trusted portfolio snapshot changes.
 * Selection must be repeated explicitly after such a change.
 */
export function resolvePortfolioEngagement(
  projection: PortfolioFeatureProjection,
  selection?: PortfolioSelection,
): PortfolioEngagement | undefined {
  if (!selection || selection.portfolioId !== projection.portfolio.id) return undefined
  const entry = projection.portfolio.engagements.find((candidate) => candidate.engagementId === selection.engagementId)
  if (
    !entry
    || entry.scope.tenantId !== selection.tenantId
    || entry.scope.siteId !== selection.siteId
    || entry.scope.siteScopeRevisionId !== selection.siteScopeRevisionId
    || entry.trustedTarget !== selection.trustedTarget
    || entry.currentRunId !== selection.currentRunId
    || entry.workspaceId !== selection.workspaceId
  ) {
    return undefined
  }
  return entry
}