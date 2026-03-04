# Solution: Throttle Frequency Response Recompute

## Tags
`#runtime` `#latency` `#cpu` `#memory` `#render-loop`

## Symptom
Frequency-response analytics were recomputed on every animation frame, increasing CPU usage and temporary allocations.

## Root cause
`computeFrequencyResponse(...)` was executed inside the `requestAnimationFrame` draw path in `src/components/shared/FrequencyResponse.tsx`.

## Fix
Added `RESPONSE_UPDATE_INTERVAL_MS = 80` and cached the last analytical response inside the draw effect. Recompute now happens at most every 80ms instead of every frame.

## Tradeoffs
- Analytical line updates at ~12.5 Hz rather than 60 Hz, which is still visually smooth for tone-curve feedback.

## Measurement
- Simulated 60fps, 600-frame loop with mocked filters:
  - compute calls: `600 -> 120`
  - total compute wall-time: `23.55ms -> 4.09ms`
  - estimated compute CPU reduction: `82.6%`

## Prevention
- Treat animation callbacks as hot paths.
- Bound expensive recomputation cadence when values do not require per-frame precision.
- Add micro-bench harnesses for high-frequency computational paths before/after changes.
