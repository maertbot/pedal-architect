# Solution: Lazy PDF Export + Font Payload Trim

## Tags
`#bundle` `#startup` `#code-splitting` `#asset-weight` `#dependency-hygiene`

## Symptom
- Main app bundle carried infrequently used PDF export code.
- Font assets included unused language subsets, increasing shipped bytes.

## Root cause
- `jspdf` was statically imported from `src/utils/pdfExport.ts`, making it part of initial loading graph.
- Entry imported broad `@fontsource/jetbrains-mono/400.css` and `700.css` subsets.

## Fix
- Converted PDF export module to lazy-load `jspdf` with cached dynamic import.
- Updated call sites to handle async export and log explicit errors.
- Switched font imports to:
  - `@fontsource/jetbrains-mono/latin-400.css`
  - `@fontsource/jetbrains-mono/latin-700.css`
  - `@fontsource/jetbrains-mono/latin-ext-400.css`
  - `@fontsource/jetbrains-mono/latin-ext-700.css`
- Moved `gh-pages` from runtime dependencies to `devDependencies`.

## Tradeoffs
- First PDF export now pays one-time lazy-load cost.
- Reduced non-latin coverage vs full font subsets.

## Measurement
- Main initial JS chunk: `731.68 kB -> 342.86 kB`.
- CSS bundle: `36.46 kB -> 14.76 kB`.
- Dist size: `1.4M -> 1.3M`.
- Runtime direct deps: `8 -> 7`.

## Prevention
- Keep heavy tooling libraries behind dynamic import when usage is optional.
- Import only required font subsets/weights in app entry.
- Review `dependencies` vs `devDependencies` during dependency additions.
