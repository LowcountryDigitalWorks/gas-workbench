import { describe, expect, it } from 'vitest'
import {
  registeredModules,
  validateModuleRegistry,
  type WorkbenchModuleDefinition,
} from './moduleRegistry'

describe('Workbench module registry', () => {
  it('registers only implemented slice modules', () => {
    expect(registeredModules.map((module) => module.id)).toEqual([
      'home',
      'evidence',
      'attention',
      'decisions',
    ])
  })

  it('rejects duplicate module identifiers', () => {
    const duplicate: readonly WorkbenchModuleDefinition[] = [
      {
        id: 'home',
        label: 'Home',
        description: 'First home module.',
      },
      {
        id: 'home',
        label: 'Duplicate home',
        description: 'Invalid duplicate.',
      },
    ]

    expect(() => validateModuleRegistry(duplicate)).toThrow(
      'Duplicate Workbench module id: home',
    )
  })
})
