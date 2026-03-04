import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CIRCUITS, getCircuitDefaults } from '../data/circuits'
import { getEnclosureById } from '../data/enclosures'
import { getLesson } from '../data/learn'
import type { LearnStep } from '../data/learn/types'
import type { PlacedComponent } from '../audio/types'
import type { SamplePreset } from '../audio/AudioEngine'

type AppTab = 'circuit' | 'enclosure' | 'learn'

interface AppState {
  currentCircuit: string
  parameters: Record<string, Record<string, number>>
  audioPlaying: boolean
  selectedSample: SamplePreset
  enclosureSize: string
  placedComponents: PlacedComponent[]
  selectedComponentId: string | null
  activeTab: AppTab
  highlightedBlock: string | null
  componentBypasses: Record<string, boolean>
  componentMultipliers: Record<string, number>
  selectedWdfComponent: string | null
  learnCircuitId: string | null
  learnStepIndex: number
  setCircuit: (circuitId: string) => void
  setParameter: (circuitId: string, parameterId: string, value: number) => void
  resetCurrentCircuitParameters: () => void
  setAudioPlaying: (playing: boolean) => void
  setSample: (sample: SamplePreset) => void
  setEnclosureSize: (sizeId: string, clearComponents?: boolean) => void
  addPlacedComponent: (component: PlacedComponent) => void
  updatePlacedComponent: (id: string, x: number, y: number) => void
  removePlacedComponent: (id: string) => void
  clearPlacedComponents: () => void
  setSelectedComponentId: (id: string | null) => void
  setActiveTab: (tab: AppTab) => void
  setHighlightedBlock: (blockId: string | null) => void
  setComponentBypass: (componentId: string, bypassed: boolean) => void
  setComponentMultiplier: (componentId: string, multiplier: number) => void
  resetAllWdfComponents: () => void
  setSelectedWdfComponent: (componentId: string | null) => void
  startLesson: (circuitId: string) => void
  nextLearnStep: () => void
  prevLearnStep: () => void
  exitLesson: () => void
  applyLearnStepState: (step: LearnStep) => void
}

const circuitDefaults = Object.fromEntries(CIRCUITS.map((circuit) => [circuit.id, getCircuitDefaults(circuit.id)]))

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentCircuit: CIRCUITS[0].id,
      parameters: circuitDefaults,
      audioPlaying: false,
      selectedSample: 'strum',
      enclosureSize: '125B',
      placedComponents: [],
      selectedComponentId: null,
      activeTab: 'circuit',
      highlightedBlock: null,
      componentBypasses: {},
      componentMultipliers: {},
      selectedWdfComponent: null,
      learnCircuitId: null,
      learnStepIndex: 0,
      setCircuit: (circuitId) => {
        if (!circuitDefaults[circuitId]) return
        set({ currentCircuit: circuitId, highlightedBlock: null, selectedWdfComponent: null })
      },
      setParameter: (circuitId, parameterId, value) => {
        set((state) => ({
          parameters: {
            ...state.parameters,
            [circuitId]: {
              ...state.parameters[circuitId],
              [parameterId]: value,
            },
          },
          highlightedBlock: parameterId,
        }))
      },
      resetCurrentCircuitParameters: () => {
        const { currentCircuit } = get()
        set((state) => ({
          parameters: {
            ...state.parameters,
            [currentCircuit]: getCircuitDefaults(currentCircuit),
          },
          highlightedBlock: null,
        }))
      },
      setAudioPlaying: (playing) => set({ audioPlaying: playing }),
      setSample: (sample) => set({ selectedSample: sample }),
      setEnclosureSize: (sizeId, clearComponents = true) => {
        const enclosure = getEnclosureById(sizeId)
        set({
          enclosureSize: enclosure.id,
          placedComponents: clearComponents ? [] : get().placedComponents,
          selectedComponentId: null,
        })
      },
      addPlacedComponent: (component) => {
        set((state) => ({
          placedComponents: [...state.placedComponents, component],
          selectedComponentId: component.id,
        }))
      },
      updatePlacedComponent: (id, x, y) => {
        set((state) => ({
          placedComponents: state.placedComponents.map((component) =>
            component.id === id ? { ...component, x, y } : component,
          ),
        }))
      },
      removePlacedComponent: (id) => {
        set((state) => ({
          placedComponents: state.placedComponents.filter((component) => component.id !== id),
          selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
        }))
      },
      clearPlacedComponents: () => set({ placedComponents: [], selectedComponentId: null }),
      setSelectedComponentId: (id) => set({ selectedComponentId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setHighlightedBlock: (blockId) => set({ highlightedBlock: blockId }),
      setComponentBypass: (componentId, bypassed) => {
        set((state) => ({
          componentBypasses: {
            ...state.componentBypasses,
            [componentId]: bypassed,
          },
        }))
      },
      setComponentMultiplier: (componentId, multiplier) => {
        set((state) => ({
          componentMultipliers: {
            ...state.componentMultipliers,
            [componentId]: multiplier,
          },
        }))
      },
      resetAllWdfComponents: () => set({ componentBypasses: {}, componentMultipliers: {}, selectedWdfComponent: null }),
      setSelectedWdfComponent: (componentId) => set({ selectedWdfComponent: componentId }),
      startLesson: (circuitId) => {
        const lesson = getLesson(circuitId)
        if (!lesson) return

        get().setCircuit(circuitId)
        get().setActiveTab('circuit')
        set({ learnCircuitId: circuitId, learnStepIndex: 0 })
        get().applyLearnStepState(lesson.steps[0])
      },
      nextLearnStep: () => {
        const { learnCircuitId, learnStepIndex } = get()
        if (!learnCircuitId) return
        const lesson = getLesson(learnCircuitId)
        if (!lesson) return

        const nextIndex = Math.min(learnStepIndex + 1, lesson.steps.length - 1)
        if (nextIndex === learnStepIndex) return

        set({ learnStepIndex: nextIndex })
        get().applyLearnStepState(lesson.steps[nextIndex])
      },
      prevLearnStep: () => {
        const { learnCircuitId, learnStepIndex } = get()
        if (!learnCircuitId) return
        const lesson = getLesson(learnCircuitId)
        if (!lesson) return

        const prevIndex = Math.max(learnStepIndex - 1, 0)
        if (prevIndex === learnStepIndex) return

        set({ learnStepIndex: prevIndex })
        get().applyLearnStepState(lesson.steps[prevIndex])
      },
      exitLesson: () => {
        get().resetAllWdfComponents()
        set({ learnCircuitId: null, learnStepIndex: 0 })
      },
      applyLearnStepState: (step) => {
        const nextBypasses: Record<string, boolean> = {}
        const nextMultipliers: Record<string, number> = {}

        ;(step.autoBypass ?? []).forEach((componentId) => {
          nextBypasses[componentId] = true
        })

        ;(step.autoValueOverrides ?? []).forEach(({ componentId, multiplier }) => {
          nextMultipliers[componentId] = multiplier
        })

        set({
          componentBypasses: nextBypasses,
          componentMultipliers: nextMultipliers,
          selectedWdfComponent: step.highlightComponents[0] ?? null,
        })
      },
    }),
    {
      name: 'pedal-architect-store-v1',
      partialize: (state) => ({
        currentCircuit: state.currentCircuit,
        parameters: state.parameters,
        selectedSample: state.selectedSample,
        enclosureSize: state.enclosureSize,
        placedComponents: state.placedComponents,
        activeTab: state.activeTab,
      }),
    },
  ),
)
