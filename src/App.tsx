import { useCallback, useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { audioEngine, type SamplePreset } from './audio/AudioEngine'
import { syncCircuitSelection } from './audio/syncCircuitSelection'
import { CircuitLab } from './components/circuit-lab/CircuitLab'
import { EnclosureDesigner } from './components/enclosure/EnclosureDesigner'
import { CIRCUITS, CIRCUIT_MAP } from './data/circuits'
import { useStore } from './store/useStore'
import { exportDrillTemplate } from './utils/pdfExport'

function App() {
  const currentCircuit = useStore((state) => state.currentCircuit)
  const parameters = useStore((state) => state.parameters)
  const audioPlaying = useStore((state) => state.audioPlaying)
  const selectedSample = useStore((state) => state.selectedSample)
  const activeTab = useStore((state) => state.activeTab)
  const enclosureSize = useStore((state) => state.enclosureSize)
  const placedComponents = useStore((state) => state.placedComponents)
  const selectedComponentId = useStore((state) => state.selectedComponentId)

  const setCircuit = useStore((state) => state.setCircuit)
  const setAudioPlaying = useStore((state) => state.setAudioPlaying)
  const setSample = useStore((state) => state.setSample)
  const resetCurrentCircuitParameters = useStore((state) => state.resetCurrentCircuitParameters)
  const setActiveTab = useStore((state) => state.setActiveTab)
  const removePlacedComponent = useStore((state) => state.removePlacedComponent)

  const [engineArmed, setEngineArmed] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const isTablet = windowWidth < 1024
  const isMobile = windowWidth < 768

  const initEngine = useCallback(async () => {
    await audioEngine.init()
    syncCircuitSelection(audioEngine, currentCircuit, parameters)
    setEngineArmed(true)
  }, [currentCircuit, parameters])

  const handleCircuitSelect = useCallback((circuitId: string) => {
    setCircuit(circuitId)
    syncCircuitSelection(audioEngine, circuitId, parameters)
  }, [parameters, setCircuit])

  const togglePlayback = async () => {
    if (!engineArmed) {
      await initEngine()
    }

    if (audioPlaying) {
      audioEngine.stop()
      setAudioPlaying(false)
    } else {
      await audioEngine.start()
      setAudioPlaying(true)
    }
  }

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!engineArmed) return
    syncCircuitSelection(audioEngine, currentCircuit, parameters)
  }, [currentCircuit, engineArmed, parameters])

  useEffect(() => {
    audioEngine.setSamplePreset(selectedSample)
  }, [selectedSample])

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return

      if (event.code === 'Space') {
        event.preventDefault()
        if (!engineArmed) {
          await initEngine()
        }
        if (audioPlaying) {
          audioEngine.stop()
          setAudioPlaying(false)
        } else {
          await audioEngine.start()
          setAudioPlaying(true)
        }
      }

      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key) - 1
        if (CIRCUITS[index]) handleCircuitSelect(CIRCUITS[index].id)
      }

      if (event.key.toLowerCase() === 'r') {
        resetCurrentCircuitParameters()
      }

      if (event.key === 'Tab' && isTablet && !isMobile) {
        event.preventDefault()
        setActiveTab(activeTab === 'circuit' ? 'enclosure' : 'circuit')
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedComponentId) {
        removePlacedComponent(selectedComponentId)
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        exportDrillTemplate(enclosureSize, placedComponents)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeTab,
    enclosureSize,
    engineArmed,
    audioPlaying,
    isMobile,
    isTablet,
    placedComponents,
    removePlacedComponent,
    resetCurrentCircuitParameters,
    selectedComponentId,
    setActiveTab,
    setAudioPlaying,
    initEngine,
    handleCircuitSelect,
  ])

  const sampleOptions = useMemo(
    () => [
      { id: 'strum', label: 'STRUM' },
      { id: 'single-note', label: 'SINGLE' },
      { id: 'arpeggio', label: 'ARPEGGIO' },
      { id: 'power-chord', label: 'POWER' },
    ] as { id: SamplePreset; label: string }[],
    [],
  )

  const handleFirstInteraction = async (
    event: ReactKeyboardEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>,
  ) => {
    if (engineArmed) return
    if ('key' in event && event.key !== 'Enter') return
    await initEngine()
  }

  return (
    <div className="app-shell" onMouseDown={handleFirstInteraction} onKeyDown={handleFirstInteraction} role="application" tabIndex={0}>
      {!engineArmed ? <div className="audio-overlay">CLICK ANYWHERE TO ARM AUDIO ENGINE</div> : null}

      <header className="topbar panel">
        <div className="brand">
          <div className="brand-title">PEDAL ARCHITECT</div>
          <div className="brand-subtitle">TACTICAL FX WORKBENCH</div>
        </div>

        <div className="top-controls">
          <label>
            CIRCUIT
            <select value={currentCircuit} onChange={(event) => handleCircuitSelect(event.target.value)}>
              {CIRCUITS.map((circuit, index) => (
                <option key={circuit.id} value={circuit.id}>{`${index + 1}. ${circuit.name}`}</option>
              ))}
            </select>
          </label>

          <label>
            SOURCE
            <select value={selectedSample} onChange={(event) => setSample(event.target.value as SamplePreset)}>
              {sampleOptions.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className={audioPlaying ? 'action-btn stop' : 'action-btn'} onClick={() => void togglePlayback()}>
            {audioPlaying ? 'STOP' : 'PLAY'}
          </button>
        </div>
      </header>

      {isTablet && !isMobile ? (
        <div className="tab-row panel">
          <button className={activeTab === 'circuit' ? 'mode-btn active' : 'mode-btn'} onClick={() => setActiveTab('circuit')}>
            CIRCUIT LAB
          </button>
          <button className={activeTab === 'enclosure' ? 'mode-btn active' : 'mode-btn'} onClick={() => setActiveTab('enclosure')}>
            ENCLOSURE
          </button>
        </div>
      ) : null}

      <main className={isTablet ? 'main-workbench single' : 'main-workbench split'}>
        {(!isTablet || activeTab === 'circuit') && (
          <section className="workspace-pane">
            <h2>{CIRCUIT_MAP[currentCircuit].name}</h2>
            <CircuitLab audioEngine={audioEngine} onSelectCircuit={handleCircuitSelect} />
          </section>
        )}

        {!isMobile && (!isTablet || activeTab === 'enclosure') && (
          <section className="workspace-pane enclosure-pane">
            <h2>Enclosure Designer</h2>
            <EnclosureDesigner />
          </section>
        )}
      </main>

      <footer className="bottombar panel">
        <span>[SPACE] PLAY/STOP</span>
        <span>[1-9] CIRCUITS</span>
        <span>[R] RESET</span>
        <span>[CMD/CTRL+E] EXPORT PDF</span>
      </footer>
    </div>
  )
}

export default App
