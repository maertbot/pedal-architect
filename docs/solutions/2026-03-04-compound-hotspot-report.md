# Compound Hotspot Report (2026-03-04)

## Architecture map
- App shell and orchestration: `src/App.tsx`
- Circuit UI and visualization: `src/components/circuit-lab/*`
- Frequency analytics: `src/audio/frequencyResponse.ts`, `src/components/shared/FrequencyResponse.tsx`
- Enclosure export path: `src/components/enclosure/EnclosureDesigner.tsx`, `src/utils/pdfExport.ts`
- Entry/runtime assets: `src/main.tsx`, `src/index.css`

## Baseline snapshot
- Build: `real 2.25s` (`npm run build`)
- Largest initial JS chunk: `731.68 kB` (`dist/assets/index-*.js`)
- Dist size: `1.4M`
- Direct runtime deps: `8`

## Hotspot table
| Hotspot | Why hot/heavy | Proposed fix | Impact | Risk | Effort | Measurement |
|---|---|---|---|---|---|---|
| `src/utils/pdfExport.ts` + static import in app paths | `jspdf` and transitive chunks inflated initial bundle despite infrequent use | Lazy-load `jspdf` via dynamic import and cache module promise | High startup byte reduction | Low | Small | Build artifact sizes |
| `src/main.tsx` font imports | Full unicode subsets imported for a mostly English UI | Switch to `latin` + `latin-ext` only for 400/700 weights | Medium asset reduction | Low-Med (non-latin glyphs) | Small | Dist asset inventory |
| `src/components/shared/FrequencyResponse.tsx` draw loop | Analytical response recomputed every frame with array-heavy math | Throttle recompute cadence to bounded interval (80ms) | High runtime CPU/memory pressure reduction | Low | Small | Simulated 60fps compute loop |
| `package.json` dependency placement | Deploy utility listed as runtime dependency | Move `gh-pages` to `devDependencies` | Low-Med runtime dep hygiene | Low | Small | Runtime dep count |
| `src/audio/frequencyResponse.ts` allocations | Per-call temporary arrays can pressure GC under frequent calls | (Future) optional reusable scratch buffers | Medium | Med | Medium | Targeted micro-bench + heap profile |

## Selected work items
1. Lazy-load PDF export path.
2. Trim font subsets.
3. Throttle frequency-response analytical recomputation.
4. Move deploy-only package to dev dependency.
