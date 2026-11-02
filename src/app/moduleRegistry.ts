export const workbenchModuleIds = [
  'home',
  'discover',
  'visibility',
  'technical',
  'evidence',
  'attention',
  'decisions',
  'measurement',
  'reports',
] as const

export type WorkbenchModuleId = (typeof workbenchModuleIds)[number]

export interface WorkbenchModuleDefinition {
  readonly id: WorkbenchModuleId
  readonly label: string
  readonly description: string
}

export const registeredModules = [
  { id: 'home', label: 'Home', description: 'Current site state.' },
  { id: 'visibility', label: 'Visibility', description: 'Source-native visibility evidence.' },
  { id: 'technical', label: 'Technical', description: 'Technical, longitudinal, and discovery evidence.' },
  {
    id: 'evidence',
    label: 'Evidence',
    description: 'Source readiness and exact provenance.',
  },
  {
    id: 'attention',
    label: 'Attention',
    description: 'Unranked human review.',
  },
  {
    id: 'decisions',
    label: 'Decision',
    description: 'Human draft and supplied decision context.',
  },
  {
    id: 'measurement',
    label: 'Measure / Outcomes',
    description: 'Measurement readiness, interpretation limits, and human outcomes.',
  },
] as const satisfies readonly WorkbenchModuleDefinition[]

export function validateModuleRegistry(
  modules: readonly WorkbenchModuleDefinition[],
): void {
  const seen = new Set<WorkbenchModuleId>()

  for (const module of modules) {
    if (seen.has(module.id)) {
      throw new Error(`Duplicate Workbench module id: ${module.id}`)
    }
    seen.add(module.id)
  }
}

validateModuleRegistry(registeredModules)
