# BR-05 — Topology Readability + Signal Flow Path

## Symptom (lay description)
Topology labels were too small/jumbled and animated flow appeared as a straight horizontal line rather than following real circuit connections.

## PRD reference
- `docs/PRD-wdf-learn-mode.md` Phase 2 visual quality gates:
  - readability
  - clear signal path hierarchy
  - flow animation tied to topology.

## Failing check first (deterministic repro script)
- `scripts/repro/BR-05-topology-readability-and-flow.mjs`
- Initially failed for:
  - insufficient font sizes
  - straight `signal-trace` baseline animation
  - no per-connection flow path class.

## Root cause
- Typography scale in CSS prioritized compactness over legibility.
- Flow animation was attached to a global baseline line, not the routed topology paths.

## Fix summary
- `src/components/circuit-lab/CircuitTopology.tsx`
  - removed animated straight line
  - added animated flow class on actual connection paths (`signal-flow-path`)
- `src/index.css`
  - increased stage/component/value font sizes
  - added stroke-backed text for contrast/readability
  - moved animated glow/dash behavior to connection paths.

## Prevention
- Keep script-based check for minimum topology font sizes and connection-path flow wiring.
- Maintain readable defaults as a hard UI invariant for Circuit Lab/Learn views.
