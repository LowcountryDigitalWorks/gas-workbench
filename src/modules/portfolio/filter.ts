import type { PortfolioEngagement, PortfolioFeatureProjection } from '../../engine/portfolio-projection'
import { resolvePortfolioEngagement, type PortfolioSelection } from './selection'

export const PORTFOLIO_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'no-current-run', label: 'No current run' },
  { id: 'attention-present', label: 'Attention present' },
  { id: 'source-exceptions', label: 'Source exceptions' },
] as const

export type PortfolioFilter = typeof PORTFOLIO_FILTERS[number]['id']

/** One atomic presentation state: a filter change drops the prior tenant choice. */
export interface PortfolioFilterState {
  readonly filter: PortfolioFilter
  readonly selection?: PortfolioSelection
}

/** Preserve an explicit choice only when the operator did not change filters. */
export function changePortfolioFilter(
  state: PortfolioFilterState,
  nextFilter: PortfolioFilter,
): PortfolioFilterState {
  return state.filter === nextFilter ? state : { filter: nextFilter }
}

const sourceExceptions = new Set<string>([
  'source_not_supplied', 'source_unavailable', 'source_unsupported',
  'source_freshness_unknown', 'source_stale',
])

/**
 * Presentation-only filtering of accepted portfolio navigation facts.
 * Preserves inventory order. Never scores, ranks, or grants tenant access.
 */
export function filterPortfolioEngagements(
  engagements: readonly PortfolioEngagement[],
  filter: PortfolioFilter,
): readonly PortfolioEngagement[] {
  switch (filter) {
    case 'all': return engagements
    case 'no-current-run': return engagements.filter((entry) => entry.currentRunState === 'no_current_run')
    case 'attention-present': return engagements.filter((entry) => entry.attentionCount > 0)
    case 'source-exceptions': return engagements.filter((entry) =>
      entry.exceptions.some((exception) => sourceExceptions.has(exception.kind)))
  }
}

/** Explicitly dismiss local tenant detail without changing the chosen factual filter.
 * This is presentation state only, never authentication or grant revocation.
 */
export function clearPortfolioSelection(state: PortfolioFilterState): PortfolioFilterState {
  return state.selection === undefined ? state : { filter: state.filter }
}

/** A filtered-out selection is never allowed to render another tenant's detail. */
export function resolveVisiblePortfolioEngagement(
  projection: PortfolioFeatureProjection,
  selection: PortfolioSelection | undefined,
  filter: PortfolioFilter,
): PortfolioEngagement | undefined {
  const selected = resolvePortfolioEngagement(projection, selection)
  if (!selected) return undefined
  return filterPortfolioEngagements(projection.portfolio.engagements, filter)
    .some((entry) => entry.engagementId === selected.engagementId) ? selected : undefined
}
