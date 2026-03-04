import { useEffect, useMemo, useRef, useState } from 'react'
import type { AudioEngine } from '../../audio/AudioEngine'
import { getTopology } from '../../audio/wdf/topology'
import { tubeScreamerWDFComponents } from '../../audio/wdf/circuits/tubeScreamerWDF'
import { CIRCUIT_MAP } from '../../data/circuits'
import { useStore } from '../../store/useStore'
import { CircuitDiagram } from './CircuitDiagram'
import { CircuitSelector } from './CircuitSelector'
import { ComponentInfoPanel } from './ComponentInfoPanel'
import { CircuitTopology } from './CircuitTopology'
import { ParameterControls } from './ParameterControls'
import { Oscilloscope } from '../shared/Oscilloscope'
import { FrequencyResponse } from '../shared/FrequencyResponse'

interface CircuitLabProps {
  audioEngine: AudioEngine
  onSelectCircuit: (circuitId: string) => void
}

export function CircuitLab({ audioEngine, onSelectCircuit }: CircuitLabProps) {
  const [scopeMode, setScopeMode] = useState<'waveform' | 'fft'>('waveform')
  const [levelSnapshot, setLevelSnapshot] = useState<Record<string, number>>({})
  const currentCircuit = useStore((state) => state.currentCircuit)
  const parameters = useStore((state) => state.parameters[currentCircuit])
  const highlightedBlock = useStore((state) => state.highlightedBlock)
  const audioPlaying = useStore((state) => state.audioPlaying)
  const componentBypasses = useStore((state) => state.componentBypasses)
  const componentMultipliers = useStore((state) => state.componentMultipliers)
  const selectedWdfComponent = useStore((state) => state.selectedWdfComponent)
  const setParameter = useStore((state) => state.setParameter)
  const setComponentBypass = useStore((state) => state.setComponentBypass)
  const setComponentMultiplier = useStore((state) => state.setComponentMultiplier)
  const resetAllWdfComponents = useStore((state) => state.resetAllWdfComponents)
  const setSelectedWdfComponent = useStore((state) => state.setSelectedWdfComponent)

  const levelsRef = useRef<Record<string, number>>({})
  const lastLevelUiSyncRef = useRef(0)

  const circuit = useMemo(() => CIRCUIT_MAP[currentCircuit], [currentCircuit])
  const topology = useMemo(() => getTopology(currentCircuit), [currentCircuit])
  const wdfComponents = useMemo(
    () => (currentCircuit === 'tube-screamer-wdf' ? tubeScreamerWDFComponents : []),
    [currentCircuit],
  )
  const selectedComponentMeta = useMemo(
    () => wdfComponents.find((component) => component.id === selectedWdfComponent) ?? null,
    [selectedWdfComponent, wdfComponents],
  )

  const filterNodes = audioEngine.getFilterNodes()
  const phaserConfig = audioEngine.getPhaserConfig()

  const handleParameterChange = (parameterId: string, value: number) => {
    setParameter(currentCircuit, parameterId, value)
    audioEngine.setParameter(currentCircuit, parameterId, value)
  }

  const handleBypassChange = (componentId: string, bypassed: boolean) => {
    setComponentBypass(componentId, bypassed)
    audioEngine.bypassWdfComponent(componentId, bypassed)
  }

  const handleMultiplierChange = (componentId: string, multiplier: number) => {
    setComponentMultiplier(componentId, multiplier)
    audioEngine.setWdfComponentMultiplier(componentId, multiplier)
  }

  const handleResetAll = () => {
    wdfComponents.forEach((component) => {
      audioEngine.bypassWdfComponent(component.id, false)
      audioEngine.setWdfComponentMultiplier(component.id, 1)
    })
    resetAllWdfComponents()
  }

  useEffect(() => {
    if (circuit.engine !== 'wdf') {
      setSelectedWdfComponent(null)
      return
    }

    const incomingLevels = audioEngine.getWdfComponentLevels()
    Object.entries(incomingLevels).forEach(([componentId, value]) => {
      levelsRef.current[componentId] = value
    })

    let rafId = 0
    const tick = () => {
      const nextLevels = audioEngine.getWdfComponentLevels()
      Object.keys(levelsRef.current).forEach((componentId) => {
        if (!(componentId in nextLevels)) {
          delete levelsRef.current[componentId]
        }
      })
      Object.entries(nextLevels).forEach(([componentId, value]) => {
        levelsRef.current[componentId] = value
      })

      const now = performance.now()
      if (now - lastLevelUiSyncRef.current > 120) {
        lastLevelUiSyncRef.current = now
        setLevelSnapshot({ ...levelsRef.current })
      }
      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [audioEngine, circuit.engine, currentCircuit, setSelectedWdfComponent])

  useEffect(() => {
    if (circuit.engine !== 'wdf') return

    wdfComponents.forEach((component) => {
      audioEngine.bypassWdfComponent(component.id, Boolean(componentBypasses[component.id]))
      audioEngine.setWdfComponentMultiplier(component.id, componentMultipliers[component.id] ?? 1)
    })
  }, [audioEngine, circuit.engine, componentBypasses, componentMultipliers, wdfComponents])

  return (
    <div className="circuit-lab-shell">
      <div className="scope-row panel">
        <div className="panel-title">OSCILLOSCOPE</div>
        <div className="scope-toolbar">
          <button className={scopeMode === 'waveform' ? 'mode-btn active' : 'mode-btn'} onClick={() => setScopeMode('waveform')}>
            TIME
          </button>
          <button className={scopeMode === 'fft' ? 'mode-btn active' : 'mode-btn'} onClick={() => setScopeMode('fft')}>
            FFT
          </button>
        </div>
        <Oscilloscope analyser={audioEngine.getAnalyser()} mode={scopeMode} />
      </div>

      <div className="freq-response-row panel">
        <div className="panel-title">FREQUENCY RESPONSE</div>
        <FrequencyResponse
          filterNodes={filterNodes}
          phaserConfig={phaserConfig}
          analyser={audioEngine.getAnalyser()}
          isPlaying={audioPlaying}
          circuitId={currentCircuit}
          circuitName={circuit.name}
          hasNoToneControl={currentCircuit === 'fuzz-face'}
        />
      </div>

      <ParameterControls circuit={circuit} values={parameters ?? {}} onChange={handleParameterChange} />

      {circuit.engine === 'wdf' && topology ? (
        <div className="topology-stack">
          <div className="topology-actions">
            <button type="button" className="reset-all-btn" onClick={handleResetAll}>RESET ALL</button>
          </div>
          <div className="topology-wrap">
            <CircuitTopology
              topology={topology}
              components={wdfComponents}
              bypasses={componentBypasses}
              multipliers={componentMultipliers}
              selectedComponent={selectedWdfComponent}
              levels={levelSnapshot}
              onSelectComponent={setSelectedWdfComponent}
            />
            {selectedComponentMeta ? (
              <ComponentInfoPanel
                component={selectedComponentMeta}
                bypassed={Boolean(componentBypasses[selectedComponentMeta.id])}
                multiplier={componentMultipliers[selectedComponentMeta.id] ?? 1}
                onBypassChange={(next) => handleBypassChange(selectedComponentMeta.id, next)}
                onMultiplierChange={(next) => handleMultiplierChange(selectedComponentMeta.id, next)}
                onClose={() => setSelectedWdfComponent(null)}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <CircuitDiagram highlightedBlock={highlightedBlock} />
      )}

      <CircuitSelector currentCircuit={currentCircuit} onSelect={onSelectCircuit} />
    </div>
  )
}
