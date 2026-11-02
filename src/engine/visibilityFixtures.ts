import comparable from './fixtures/visibility/comparable-search.json'
import discontinuity from './fixtures/visibility/source-discontinuity.json'
import aiLimited from './fixtures/visibility/ai-limited.json'
import mixed from './fixtures/visibility/mixed-availability.json'
import { decodeWorkbenchProjection } from './integrity'
import { decodeVisibilityProjection } from './visibility-projection'
import type { WorkbenchProjection } from './projection'

export const visibilityFixtureIds = ['comparable-search', 'source-discontinuity', 'ai-limited', 'mixed-availability'] as const
export type VisibilityFixtureId = (typeof visibilityFixtureIds)[number]
const fixtures = { 'comparable-search': comparable, 'source-discontinuity': discontinuity, 'ai-limited': aiLimited, 'mixed-availability': mixed }

export async function loadVisibilityFixture(id: VisibilityFixtureId, shell?: WorkbenchProjection) {
  const workspace = shell ?? decodeWorkbenchProjection((await import('./fixtures/visibility-review.json')).default)
  return decodeVisibilityProjection(fixtures[id], workspace)
}
