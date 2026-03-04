import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { audioEngine, type SamplePreset } from './audio/AudioEngine'
import { syncCircuitSelection } from './audio/syncCircuitSelection'
import { CircuitLab } from './components/circuit-lab/CircuitLab'
import { EnclosureDesigner } from './components/enclosure/EnclosureDesigner'
import { LearnTab } from './components/learn/LearnTab'
import { CIRCUITS, CIRCUIT_MAP } from './data/circuits'
import { useStore } from './store/useStore'
import { exportDrillTemplate } from './utils/pdfExport'

function App() {
  type EngineState = 'idle' | 'initializing' | 'ready'

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
  const setLearnCircuit = useStore((state) => state.setLearnCircuit)
  const setLearnStep = useStore((state) => state.setLearnStep)
  const resetAllWdfComponents = useStore((state) => state.resetAllWdfComponents)

  const [engineState, setEngineState] = useState<EngineState>('idle')
  const [showEngineOnline, setShowEngineOnline] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const onlineTimeoutRef = useRef<number | null>(null)

  const isTablet = windowWidth < 1024
  const isMobile = windowWidth < 768

  const initEngine = useCallback(async () => {
    if (engineState === 'ready') return true
    if (engineState === 'initializing') return false

    setEngineState('initializing')
    setInitError(null)
    try {
      await audioEngine.init()
      syncCircuitSelection(audioEngine, currentCircuit, parameters)
      setEngineState('ready')
      setShowEngineOnline(true)
      if (onlineTimeoutRef.current !== null) {
        window.clearTimeout(onlineTimeoutRef.current)
      }
      onlineTimeoutRef.current = window.setTimeout(() => {
        setShowEngineOnline(false)
      }, 400)
      return true
    } catch (error) {
      console.error('Audio engine init failed', error)
      setInitError('AUDIO INIT FAILED — CLICK TO RETRY')
      setEngineState('idle')
      setShowEngineOnline(false)
      return false
    }
  }, [currentCircuit, engineState, parameters])

  const handleCircuitSelect = useCallback((circuitId: string) => {
    setCircuit(circuitId)
    syncCircuitSelection(audioEngine, circuitId, parameters)
  }, [parameters, setCircuit])

  const togglePlayback = async () => {
    if (engineState !== 'ready') {
      const ready = await initEngine()
      if (!ready) return
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
    if (engineState !== 'ready') return
    syncCircuitSelection(audioEngine, currentCircuit, parameters)
    // Parameter updates are applied directly through setParameter handlers.
    // Re-syncing on every parameter change can re-run setCircuit() and cause audible glitches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCircuit, engineState])

  useEffect(() => {
    audioEngine.setSamplePreset(selectedSample)
  }, [selectedSample])

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return

      if (event.code === 'Space') {
        event.preventDefault()
        if (engineState !== 'ready') {
          const ready = await initEngine()
          if (!ready) return
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
        if (activeTab === 'circuit') setActiveTab('learn')
        else if (activeTab === 'learn') setActiveTab('enclosure')
        else setActiveTab('circuit')
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedComponentId) {
        removePlacedComponent(selectedComponentId)
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        try {
          await exportDrillTemplate(enclosureSize, placedComponents)
        } catch (error) {
          console.error('PDF export failed', error)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeTab,
    enclosureSize,
    engineState,
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
    resetAllWdfComponents,
    setLearnCircuit,
    setLearnStep,
  ])

  useEffect(() => {
    if (activeTab === 'learn') return
    setLearnCircuit(null)
    setLearnStep(0)
    resetAllWdfComponents()
  }, [activeTab, resetAllWdfComponents, setLearnCircuit, setLearnStep])

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
    if (engineState === 'ready' || engineState === 'initializing') return
    if ('key' in event && event.key !== 'Enter') return
    await initEngine()
  }

  useEffect(() => {
    return () => {
      if (onlineTimeoutRef.current !== null) {
        window.clearTimeout(onlineTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="app-shell" onMouseDown={handleFirstInteraction} onKeyDown={handleFirstInteraction} role="application" tabIndex={0}>
      {(engineState !== 'ready' || showEngineOnline) ? (
        <div className={engineState === 'initializing' ? 'audio-overlay initializing' : 'audio-overlay'}>
          {showEngineOnline
            ? 'ENGINE ONLINE'
            : initError ?? (engineState === 'initializing' ? 'INITIALIZING ENGINE...' : 'CLICK ANYWHERE TO ARM AUDIO ENGINE')}
        </div>
      ) : null}

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
                <option key={circuit.id} value={circuit.id}>
                  {`${index + 1}. ${circuit.engine === 'wdf' ? '◆ ' : ''}${circuit.name}`}
                </option>
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

      <div className="tab-row panel">
        <button className={activeTab === 'circuit' ? 'mode-btn active' : 'mode-btn'} onClick={() => setActiveTab('circuit')}>
          CIRCUIT LAB
        </button>
        <button className={activeTab === 'learn' ? 'mode-btn active' : 'mode-btn'} onClick={() => setActiveTab('learn')}>
          LEARN
        </button>
        <button className={activeTab === 'enclosure' ? 'mode-btn active' : 'mode-btn'} onClick={() => setActiveTab('enclosure')}>
          ENCLOSURE
        </button>
      </div>

      <main className={isTablet ? 'main-workbench single' : 'main-workbench split'}>
        {activeTab === 'circuit' && (
          <section className="workspace-pane">
            <h2>{CIRCUIT_MAP[currentCircuit].name}</h2>
            <CircuitLab audioEngine={audioEngine} onSelectCircuit={handleCircuitSelect} />
          </section>
        )}

        {activeTab === 'enclosure' && (
          <section className="workspace-pane enclosure-pane">
            <h2>Enclosure Designer</h2>
            <EnclosureDesigner />
          </section>
        )}

        {activeTab === 'learn' && (
          <section className="workspace-pane learn-pane">
            <h2>Learn Mode</h2>
            <LearnTab audioEngine={audioEngine} />
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
