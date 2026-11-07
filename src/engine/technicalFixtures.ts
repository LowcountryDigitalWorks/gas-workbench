import ready from './fixtures/technical/ready.json'
import changed from './fixtures/technical/changed.json'
import coverage from './fixtures/technical/coverage-unknown.json'
import discovery from './fixtures/technical/discovery-candidate.json'
import quiet from './fixtures/technical/quiet.json'
import blocked from './fixtures/technical/blocked-siteone.json'
import { decodeWorkbenchProjection } from './integrity'
import { decodeTechnicalProjection } from './technical-projection'
import type { WorkbenchProjection } from './projection'

export const technicalFixtureIds = ['ready', 'changed', 'coverage-unknown', 'discovery-candidate', 'quiet', 'blocked-siteone'] as const
export type TechnicalFixtureId = (typeof technicalFixtureIds)[number]
const fixtures = { ready, changed, 'coverage-unknown': coverage, 'discovery-candidate': discovery, quiet, 'blocked-siteone': blocked }

export async function loadTechnicalFixture(id: TechnicalFixtureId, shell?: WorkbenchProjection) {
  const workspace = shell ?? decodeWorkbenchProjection((await import('./fixtures/technical-review.json')).default)
  return decodeTechnicalProjection(fixtures[id], workspace)
}
