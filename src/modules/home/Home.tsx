import type { WorkbenchProjection } from '../../engine/projection'
import { Badge, Notice } from '../../design-system/primitives'
import { moduleName } from '../../design-system/format'

export function Home({
  projection,
  inspect,
  review,
}: {
  projection: WorkbenchProjection
  inspect: (moduleId?: string) => void
  review: () => void
}) {
  const w = projection.workspace
  const readyModules = w.readiness
    .filter((source) => source.state === 'ready')
    .map((source) => moduleName(source.moduleId))
  const limited = w.readiness.filter(
    (source) => source.state !== 'ready' && source.state !== 'not_supplied',
  )
  return (
    <section className="home-view" aria-labelledby="home-title">
      <p className="eyebrow">Current snapshot</p>
      <h2 id="home-title">
        {w.attention.length
          ? `${w.attention.length} ${w.attention.length === 1 ? 'item' : 'items'} for human review`
          : limited.length
            ? 'Understand the evidence limits'
            : 'No Attention items in this snapshot'}
      </h2>
      <p className="lede">
        {w.attention.length
          ? 'Review the linked evidence before preparing a human decision draft. Attention is unranked.'
          : limited.length
            ? 'Zero Attention items is not a no-action finding. Inspect the source coverage before interpreting this snapshot.'
            : `${readyModules.length ? `Ready modules supplied: ${readyModules.join(', ')}.` : 'No ready module was supplied.'} No Attention items were supplied; this is not an all-site health or proven-absence claim.`}
      </p>
      {limited.length > 0 && (
        <Notice>
          {limited.map((source) => (
            <p key={source.moduleId}>
              {moduleName(source.moduleId)}: <strong>{source.state}</strong> —{' '}
              <code>{source.reasons.join('; ') || 'No reason supplied'}</code>
            </p>
          ))}
        </Notice>
      )}
      {[...new Set(w.attention.flatMap((item) => item.readinessContext))].map(
        (reason) => (
          <Notice key={reason}>{reason}</Notice>
        ),
      )}
      <div className="home-actions">
        <button
          className="primary"
          onClick={() =>
            w.attention.length ? review() : inspect(limited[0]?.moduleId)
          }
        >
          {w.attention.length ? 'Review Attention' : 'Inspect source evidence'}
        </button>
        <p>
          <strong>{w.attention.length} unranked Attention items</strong>
          <br />
          Supplied count, not priority or health.
        </p>
      </div>
      <h3>Source readiness</h3>
      <ul className="readiness-summary">
        {w.readiness.map((source) => (
          <li key={source.moduleId}>
            <span>{moduleName(source.moduleId)}</span>
            <Badge
              tone={
                source.state === 'ready'
                  ? 'ready'
                  : source.state === 'limited'
                    ? 'limited'
                    : 'neutral'
              }
            >
              {source.state === 'not_supplied'
                ? 'Not supplied'
                : source.state === 'ready'
                  ? 'Ready'
                  : source.state}
            </Badge>
            <button
              className="text-button"
              onClick={() => inspect(source.moduleId)}
            >
              Inspect{' '}
              <span className="sr-only">{moduleName(source.moduleId)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="muted">
        Not supplied means no module evidence was provided. It does not mean an
        observed zero.
      </p>
    </section>
  )
}
