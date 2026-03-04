# Pedal Architect Engineering Mission

## Mission
Optimize for user-perceived speed and stability with small, reviewable diffs:
1. Faster startup and interaction latency.
2. Lower memory pressure and fewer avoidable allocations.
3. Lighter production footprint (runtime deps and shipped assets).

Preserve behavior, type safety, and explicit error handling.

## Guardrails
- No broad rewrites.
- Prefer hot-path simplification over architectural churn.
- Avoid new heavy dependencies.
- No silent error swallowing; log actionable context.
- Keep changes composable and easy to revert.

## Validation Commands
- `npm run lint`
- `npm run test`
- `npm run build`

## Optimization Rules (Compounding)
- Defer infrequent heavy code paths with dynamic imports.
- Keep non-runtime tooling in `devDependencies`.
- Limit font subsets/weights to what UI actually renders.
- Recompute expensive visual analytics at a bounded cadence, not every animation frame.
- Capture before/after measurements for every optimization change.

## Measurement Playbook
- Build and startup proxy: `/usr/bin/time -lp npm run build`
- Quality gates: `/usr/bin/time -lp npm run lint` and `/usr/bin/time -lp npm run test`
- Bundle inventory: `du -sk dist/assets/* | sort -nr | head`
- Dependency inventory: `node -e "const p=require('./package.json'); ..."` and `npm ls --omit=dev --all --parseable | wc -l`
- Frequency-response compute micro-bench:
  - compile: `npx tsc --target ES2022 --lib ES2022,DOM --module ESNext --moduleResolution Bundler --outDir .bench-dist src/audio/frequencyResponse.ts src/audio/types.ts`
  - run: local Node benchmark loop with mocked filter nodes
