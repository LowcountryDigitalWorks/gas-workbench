import type { WorkbenchAttentionItem } from '../../engine/projection'
import { Badge, Facts, Notice } from '../../design-system/primitives'
import { readable } from '../../design-system/format'

export function Attention({
  items,
  selected,
  choose,
  inspect,
  draft,
}: {
  items: readonly WorkbenchAttentionItem[]
  selected?: string
  choose: (id: string) => void
  inspect: (moduleId: string) => void
  draft: () => void
}) {
  const item = items.find((row) => row.id === selected)
  return (
    <section className="attention-view">
      <h2>Unranked Attention</h2>
      <p>Human selection, not priority, severity, or business impact.</p>
      {items.length === 0 ? (
        <Notice>
          No Attention items were supplied. This count does not establish site
          health, observed absence, or permission to act.
        </Notice>
      ) : (
        <>
          <ul className="attention-list">
            {items.map((row) => (
              <li key={row.id}>
                <button
                  className="source-row"
                  aria-pressed={selected === row.id}
                  onClick={() => choose(row.id)}
                >
                  <span>
                    <strong>{readable(row.originalKind)}</strong>
                    <code>{row.id}</code>
                  </span>
                  <Badge>{readable(row.originalState)}</Badge>
                </button>
              </li>
            ))}
          </ul>
          {item && (
            <div className="attention-detail">
              <h3>Selected review context</h3>
              <Facts
                rows={[
                  ['Attention reference', <code>{item.id}</code>],
                  ['Evidence identity', <code>{item.evidenceIdentity}</code>],
                  [
                    'Exact page',
                    <code>{item.identity.url ?? 'Not supplied'}</code>,
                  ],
                ]}
              />
              {item.readinessContext.map((reason) => (
                <Notice key={reason}>{reason}</Notice>
              ))}
              <div className="action-row">
                <button
                  className="secondary"
                  onClick={() => inspect(item.moduleId)}
                >
                  Inspect linked evidence
                </button>
                <button className="primary" onClick={draft}>
                  Prepare decision draft
                </button>
              </div>
              <p className="muted">
                A draft is human preparation only. It does not record an engine
                decision.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
