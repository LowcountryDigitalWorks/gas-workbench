import type { PortfolioFeatureProjection } from '../../engine/portfolio-projection'
import {
  preflightPortfolioWorkspaceHandoff,
  type PortfolioWorkspaceHandoff,
} from '../../engine/portfolio-workspace-preflight'
import { resolvePortfolioEngagement, type PortfolioSelection } from './selection'

/**
 * Presentation-only composition of the accepted explicit selection and
 * workspace identity guards. Neither a selection nor a match authenticates
 * a principal, validates provider/runtime authority, or authorizes data reads.
 */
export type SelectedWorkspaceHandoff =
  | Readonly<{ status: 'no_explicit_selection' | 'selection_expired' }>
  | PortfolioWorkspaceHandoff

/**
 * Fail closed before examining workspace bytes when no current, explicitly
 * selected inventory identity exists. A stale choice cannot fall back to
 * another engagement even when the new inventory reuses an engagement ID.
 */
export function preflightSelectedWorkspaceHandoff(
  portfolio: PortfolioFeatureProjection,
  selection?: PortfolioSelection,
  suppliedWorkspace?: unknown,
): SelectedWorkspaceHandoff {
  if (!selection) return { status: 'no_explicit_selection' }
  const engagement = resolvePortfolioEngagement(portfolio, selection)
  if (!engagement) return { status: 'selection_expired' }
  return preflightPortfolioWorkspaceHandoff(portfolio, engagement.engagementId, suppliedWorkspace)
}
