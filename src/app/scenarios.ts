import humanReviewFixture from '../engine/fixtures/human-review.json'
import limitedFixture from '../engine/fixtures/limited.json'
import quietFixture from '../engine/fixtures/quiet.json'
import { decodeWorkbenchProjection } from '../engine/integrity'
import {
  WorkbenchProjectionError,
  type WorkbenchProjection,
  type WorkbenchProjectionErrorCode,
} from '../engine/projection'

export const WORKBENCH_SCENARIO_KEYS = ['quiet', 'limited', 'human-review'] as const

export type WorkbenchScenarioKey = (typeof WORKBENCH_SCENARIO_KEYS)[number]

export interface WorkbenchScenarioDefinition {
  readonly label: string
  readonly shortLabel: string
  readonly description: string
  readonly projection: WorkbenchProjection
}

export type WorkbenchScenarioResult =
  | { readonly status: 'ready'; readonly scenario: WorkbenchScenarioDefinition }
  | {
      readonly status: 'error'
      readonly label: string
      readonly description: string
      readonly code: WorkbenchProjectionErrorCode | 'unexpected_projection_error'
    }

interface ScenarioInput {
  readonly label: string
  readonly shortLabel: string
  readonly description: string
  readonly fixture: unknown
}

export function decodeScenario(input: ScenarioInput): WorkbenchScenarioResult {
  try {
    return {
      status: 'ready',
      scenario: {
        label: input.label,
        shortLabel: input.shortLabel,
        description: input.description,
        projection: decodeWorkbenchProjection(input.fixture),
      },
    }
  } catch (error) {
    return {
      status: 'error',
      label: input.label,
      description: input.description,
      code: error instanceof WorkbenchProjectionError
        ? error.code
        : 'unexpected_projection_error',
    }
  }
}

export const workbenchScenarios: Readonly<Record<WorkbenchScenarioKey, WorkbenchScenarioResult>> = {
  quiet: decodeScenario({
    label: 'Quiet / adequately evidenced',
    shortLabel: 'Quiet',
    description: 'Two supplied evidence sources are ready and no Attention item is projected.',
    fixture: quietFixture,
  }),
  limited: decodeScenario({
    label: 'Limited evidence',
    shortLabel: 'Limited',
    description: 'Search Analytics is supplied with an explicit partial-coverage limitation.',
    fixture: limitedFixture,
  }),
  'human-review': decodeScenario({
    label: 'Human-review case',
    shortLabel: 'Human review',
    description: 'One unranked Attention item is linked to exact evidence and a supplied human decision.',
    fixture: humanReviewFixture,
  }),
}
