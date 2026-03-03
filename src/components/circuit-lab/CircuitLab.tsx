import { useMemo, useState } from 'react'
import type { AudioEngine } from '../../audio/AudioEngine'
import { CIRCUIT_MAP } from '../../data/circuits'
import { useStore } from '../../store/useStore'
import { CircuitDiagram } from './CircuitDiagram'
import { CircuitSelector } from './CircuitSelector'
import { ParameterControls } from './ParameterControls'
import { Oscilloscope } from '../shared/Oscilloscope'

interface CircuitLabProps {
  audioEngine: AudioEngine
}

export function CircuitLab({ audioEngine }: CircuitLabProps) {
  const [scopeMode, setScopeMode] = useState<'waveform' | 'fft'>('waveform')
  const currentCircuit = useStore((state) => state.currentCircuit)
  const parameters = useStore((state) => state.parameters[currentCircuit])
  const highlightedBlock = useStore((state) => state.highlightedBlock)
  const setParameter = useStore((state) => state.setParameter)
  const setCircuit = useStore((state) => state.setCircuit)

  const circuit = useMemo(() => CIRCUIT_MAP[currentCircuit], [currentCircuit])

  const handleParameterChange = (parameterId: string, value: number) => {
    setParameter(currentCircuit, parameterId, value)
    audioEngine.setParameter(currentCircuit, parameterId, value)
  }

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

      <ParameterControls circuit={circuit} values={parameters ?? {}} onChange={handleParameterChange} />
      <CircuitDiagram highlightedBlock={highlightedBlock} />
      <CircuitSelector currentCircuit={currentCircuit} onSelect={setCircuit} />
    </div>
  )
}
