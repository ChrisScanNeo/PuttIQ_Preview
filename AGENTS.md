# Repository Guidelines

## Project Structure & Module Organization
Keep entry points visible: user flows begin in `index.js` and `App.js`. Expo config and build metadata live beside them in `app.config.js`, `babel.config.js`, and `eas.json`. Feature code follows the React Native convention: UI primitives under `src/ui/`, audio/DSP logic within `src/dsp/`, and state machines in `src/state/`. Shared screen-level work resides in `components/`, `screens/`, `hooks/`, `services/`, and `navigation/`. Store assets in `assets/`, long-form docs in `Documents/`, and Expo runtime tweaks in `patches/` and `plugins/`.

## Build, Test, and Development Commands
Start local development with `npm run start`; add `--web` to target the browser preview. Use `npm run android` or `npm run ios` for device-specific Expo Run builds. Cloud builds run through `eas build -p android|ios --profile preview`, which reads profiles from `eas.json`. After installs, `patch-package` applies fixes automatically—check `patches/` before upgrading dependencies. Type safety is enforced with `npx tsc --noEmit`.

## Coding Style & Naming Conventions
Author new logic in TypeScript when possible; follow the shared Expo `tsconfig`. Use 2-space indentation, semicolons, and keep imports sorted logically. Components and screens use PascalCase filenames (e.g., `TimerBar.tsx`), hooks start with `use` (`hooks/useMetronomeV3.ts`), and services adopt kebab or camel case aligned with existing modules. Prefer named exports and colocate helpers near their consumers to avoid sprawling utils directories.

## Testing Guidelines
While no suite ships today, new tests should target Jest. Place specs adjacent to their sources as `*.test.ts|tsx`. Focus on deterministic DSP and state tests; mock React Native and Expo modules to keep runs fast. Add `npx jest` scripts as you extend coverage, and ensure `npx tsc --noEmit` continues to pass before opening a PR.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `refactor:`) to keep history searchable; split unrelated work into separate commits. Pull requests must list the change summary, link to tracking issues, call out affected platforms (iOS/Android/Web), and include screenshots for UI work or repro steps for audio/DSP adjustments. Verify `npm run start` and the TypeScript check before requesting review, and silence debug logging prior to merge.

## Security & Configuration Tips
Never commit secrets; load keys through `app.config.js` and EAS environment variables. Firebase integration is centered in `services/firebase.js`, so audit rules there before release. Large binaries belong in `assets/`, and `Documents/` should capture specs and plans rather than runtime artifacts.
