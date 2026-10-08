# Contributing to Regulate

Thanks for your interest in improving Regulate. This guide covers the basics for getting started.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
git clone https://github.com/Lam30ne/regulate-app.git
cd regulate-app
npm install
```

## Development

```bash
npm run dev          # Start dev server
npm run typecheck    # TypeScript check
npm test             # Run tests
npm run test:watch   # Tests in watch mode
npm run build        # Production build
```

## Project structure

```
app/
  components/       # UI components and audio engine
  hooks/            # Custom React hooks
  lib/              # Shared utilities, settings, constants
  routes/           # Route components (home.tsx is the main page)
docs/               # Design decisions, research, product principles
public/             # Static assets, service worker, manifest
```

## Architecture notes

- **React Router 7 SPA** deployed to GitHub Pages
- **Tailwind CSS 4** for styling
- **Web Audio API** for sound generation (no audio files)
- **Canvas 2D** for visuals (no WebGL)
- All state lives in `home.tsx` with prop drilling — no context providers
- The `AudioEngine` class manages the full audio graph independently from React
- Settings persist to `localStorage` with validation on load

## Writing code

- Run `npm test` and `npm run typecheck` before submitting a PR
- Follow existing patterns — look at similar components for conventions
- Keep accessibility in mind: new interactive elements need labels, keyboard support, and appropriate ARIA roles
- Avoid user-facing medical claims or terms like "brainwave entrainment"
- See `docs/product-principles.md` for design philosophy

## Testing

Tests use Vitest + Testing Library. The test setup in `app/test-setup.ts` provides mock Web Audio API classes.

```bash
npm test                    # Run all tests
npx vitest run app/a11y     # Run accessibility tests only
```

When adding a new component, add a corresponding `.test.tsx` file in the same directory.

## Pull requests

- Create a feature branch from `main`
- Write a clear PR description explaining what changed and why
- Keep PRs focused — one concern per PR when possible
