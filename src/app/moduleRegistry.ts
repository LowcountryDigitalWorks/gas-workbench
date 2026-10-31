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
