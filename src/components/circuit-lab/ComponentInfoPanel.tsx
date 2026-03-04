import type { WDFComponentMeta } from '../../audio/wdf/types'

interface ComponentInfoPanelProps {
  component: WDFComponentMeta
  bypassed: boolean
  multiplier: number
  onBypassChange: (bypassed: boolean) => void
  onMultiplierChange: (multiplier: number) => void
  onClose: () => void
}

const TYPE_ICONS: Record<WDFComponentMeta['type'], string> = {
  resistor: 'R',
  capacitor: 'C',
  diode: 'D',
  opamp: 'OA',
  pot: 'P',
  buffer: 'B',
}

const nearestStep = (value: number, steps: number[]): number => {
  let nearest = steps[0]
  let minDistance = Math.abs(value - nearest)
  for (let i = 1; i < steps.length; i += 1) {
    const distance = Math.abs(value - steps[i])
    if (distance < minDistance) {
      minDistance = distance
      nearest = steps[i]
    }
  }
  return nearest
}

function parseRealWorldValue(realWorldValue: string | undefined): { base: number; unit: string } | null {
  if (!realWorldValue) return null
  const match = realWorldValue.trim().match(/^([0-9]*\.?[0-9]+)\s*([a-zA-ZµΩkK]+)$/)
  if (!match) return null
  return {
    base: Number(match[1]),
    unit: match[2],
  }
}

function formatScaledValue(base: number, unit: string, multiplier: number): string {
  const scaled = base * multiplier
  return `${base}${unit} -> ${scaled.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}${unit} at ${multiplier.toFixed(2).replace(/\.00$/, '')}x`
}

function BypassControl({
  bypassSafe,
  bypassed,
  whatHappensWithout,
  onBypassChange,
}: {
  bypassSafe: boolean
  bypassed: boolean
  whatHappensWithout: string
  onBypassChange: (bypassed: boolean) => void
}) {
  const control = (
    <div className="bypass-control-wrap">
      <button
        type="button"
        className={`bypass-toggle ${bypassed ? 'is-bypassed' : 'is-active'}`}
        onClick={() => onBypassChange(!bypassed)}
      >
        <span className="bypass-dot" />
        <span>{bypassed ? 'BYPASSED' : 'ACTIVE'}</span>
      </button>
      <div className="bypass-hint">{whatHappensWithout}</div>
    </div>
  )

  if (bypassSafe) return control

  return (
    <details className="advanced-bypass">
      <summary>ADVANCED</summary>
      {control}
    </details>
  )
}

export function ComponentInfoPanel({
  component,
  bypassed,
  multiplier,
  onBypassChange,
  onMultiplierChange,
  onClose,
}: ComponentInfoPanelProps) {
  const valueRange = component.valueRange
  const parsedValue = parseRealWorldValue(component.realWorldValue)
  const sliderMultiplier = valueRange ? nearestStep(multiplier, valueRange.steps) : 1

  return (
    <aside className="component-info-panel open">
      <button type="button" className="panel-close-btn" onClick={onClose} aria-label="Close component details">
        ×
      </button>

      <header className="component-header">
        <div className="component-type-chip">{TYPE_ICONS[component.type]}</div>
        <div>
          <div className="component-header-name">{component.name}</div>
          <div className="component-header-value">{component.realWorldValue ?? 'N/A'}</div>
        </div>
      </header>

      <div className="component-copy">{`${component.description} ${component.whyItMatters}`}</div>

      {valueRange ? (
        <section className="component-section">
          <div className="component-section-title">VALUE MULTIPLIER</div>
          <input
            className={`value-slider ${Math.abs(sliderMultiplier - 1) > 1e-6 ? 'modified' : ''}`}
            type="range"
            min={valueRange.min}
            max={valueRange.max}
            step={0.01}
            value={sliderMultiplier}
            onChange={(event) => onMultiplierChange(nearestStep(Number(event.target.value), valueRange.steps))}
          />
          <div className="value-slider-steps">
            {valueRange.steps.map((step) => (
              <button
                key={step}
                type="button"
                className={Math.abs(sliderMultiplier - step) < 1e-6 ? 'step-btn active' : 'step-btn'}
                onClick={() => onMultiplierChange(step)}
              >
                {step}x
              </button>
            ))}
          </div>
          <div className="value-readout">
            {parsedValue ? formatScaledValue(parsedValue.base, parsedValue.unit, sliderMultiplier) : `${sliderMultiplier}x`}
          </div>
          <div className="value-hint">{component.whatHappensScaled}</div>
        </section>
      ) : (
        <section className="component-section">
          <div className="component-section-title">VALUE</div>
          <div className="value-hint">{component.whatHappensScaled}</div>
        </section>
      )}

      <section className="component-section">
        <div className="component-section-title">BYPASS</div>
        <BypassControl
          bypassSafe={component.bypassSafe}
          bypassed={bypassed}
          whatHappensWithout={component.whatHappensWithout}
          onBypassChange={onBypassChange}
        />
      </section>
    </aside>
  )
}
