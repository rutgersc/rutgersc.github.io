# Project Overview

YouTube player web app with Microsoft account integration for watch later and history sync.

## Tech Stack

- TypeScript (strict mode)
- ES modules (no bundler)
- MSAL for Microsoft auth (CDN)
- YouTube IFrame API (CDN)
- GitHub Pages hosting

## Build

```bash
npm run build    # tsc → dist/
npm run dev      # tsc --watch
```

Output goes to `dist/` (committed for GitHub Pages).

## Code Conventions

### Style

- Prefer immutable over mutable
- Prefer map/filter/reduce over forEach
- Colocate single-use functions near (inside) their caller
- No obvious comments

## File Structure

```
src/          # TypeScript source
dist/         # Compiled JS (committed)
youtube.html  # Main app
```
