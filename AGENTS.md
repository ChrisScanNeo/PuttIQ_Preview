# Repository Guidelines

## Project Structure & Module Organization
- Entry points: `index.js`, `App.js`; config in `app.config.js`, `babel.config.js`, `eas.json`.
- Source: UI in `src/ui/`, DSP in `src/dsp/`, state in `src/state/`.
- App modules: `components/`, `screens/`, `hooks/`, `services/`, `navigation/`.
- Assets: `assets/` (images/audio), docs in `Documents/`, custom patches in `patches/`, Expo plugins in `plugins/`.

## Build, Test, and Development Commands
- `npm run start` — launch Expo dev server (QR codes, web with `--web`).
- `npm run android` / `npm run ios` — build and run native apps via Expo Run.
- `eas build -p android|ios --profile preview` — cloud builds (see `eas.json`).
- Postinstall applies fixes: `patch-package` reads `patches/` automatically.
- Type check: `npx tsc --noEmit`.

## Coding Style & Naming Conventions
- Language: React Native with JS + TS (extends `expo/tsconfig.base`). Use `.ts/.tsx` for new code.
- Indentation: 2 spaces; keep lines focused; use semicolons.
- Components: PascalCase filenames (e.g., `TimingBarV3.js`, `TimerBar.tsx`).
- Hooks: start with `use` (e.g., `hooks/useMetronomeV3.js`).
- Prefer named exports; colocate module-specific files near usage.

## Testing Guidelines
- No test suite is configured yet. If adding tests, use Jest.
- Place unit tests beside sources: `*.test.ts` / `*.test.tsx`.
- Aim for fast DSP/logic tests; mock RN/Expo modules.

## Commit & Pull Request Guidelines
- Commit messages: Conventional Commits (e.g., `feat: add TimerBar`, `fix: audio drift`).
- PRs must include: clear description, linked issues, affected platforms (iOS/Android/Web), screenshots for UI, and repro steps for audio/DSP.
- Ensure `npm run start` works, type checks pass, and no stray console noise.

## Security & Configuration Tips
- Do not commit secrets; prefer env-driven config via `app.config.js` and EAS secrets.
- Firebase setup lives in `services/firebase.js`; validate rules before shipping.
- Large media lives under `assets/`; keep `Documents/` for specs and plans, not runtime data.
