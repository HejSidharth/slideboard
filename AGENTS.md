# Agent Guidelines for SlideBoard

These instructions apply to the entire repository.

## Project Summary

SlideBoard is a Next.js (App Router) application that provides a slide-based
whiteboard workflow using Excalidraw. Data is stored in localStorage via
Zustand with persistence. The UI uses Tailwind CSS and shadcn/ui components.

## Repository Rules

- Cursor rules: none found in `.cursor/rules/` or `.cursorrules`.
- Copilot rules: none found in `.github/copilot-instructions.md`.

## Commands

### Development

- Start dev server: `npm run dev`
- Production build: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint`

### Tests

- No test runner is configured in `package.json`.
- There is no known command for running a single test.
- If you add tests, document the new commands here.

## Project Structure

- `app/`: Next.js App Router routes, layouts, and pages.
- `components/`: UI components, editor, dashboard, and chat UI.
- `store/`: Zustand stores for presentation state.
- `lib/`: Utilities and shared helpers.
- `types/`: Shared TypeScript types.

## Coding Standards

### Language and Framework

- Use TypeScript for all new code.
- Use React functional components with hooks.
- Prefer named exports in components and utilities.
- Keep files small and focused by responsibility.

### Imports

- Use the path alias `@/` for internal imports.
- Order imports by category:
  1. React and Next.js.
  2. External libraries.
  3. Internal modules (alias imports).
  4. Relative imports.
  5. Type-only imports last.
- Use `import type` for type-only imports.

### Formatting

- Use double quotes for strings.
- Use semicolons.
- Use trailing commas where already present.
- Keep JSX attributes aligned and readable.
- Prefer `className` strings that match existing Tailwind style.

### Naming

- Components: `PascalCase` and named exports.
- Hooks: `useX` naming, e.g. `useChat`.
- Functions and variables: `camelCase`.
- Types and interfaces: `PascalCase`.
- Avoid one-letter variable names unless used in short callbacks.

### Types

- Prefer explicit return types for public utility functions.
- Avoid `any` in new code; use specific types or generics.
- Use `Partial<T>` for patch updates when appropriate.
- Keep shared types in `types/index.ts` when reused.

### Error Handling

- Fail gracefully in UI components; show user-facing messages when appropriate.
- For data parsing, wrap in `try/catch` and log errors with context.
- Avoid silent failures unless the feature already does so.

### State Management

- Use Zustand for global state; avoid unnecessary prop drilling.
- Keep store functions pure and avoid side effects outside `set` or `get`.
- Persist only what is necessary to localStorage.

### UI Patterns

- Use shadcn/ui components where applicable.
- Use Tailwind classes consistent with existing patterns.
- Keep layouts responsive by using flex and grid utilities.
- Keep buttons and inputs consistent with existing variants.

### Client vs Server Components

- Add `"use client"` to any component using hooks, state, or browser APIs.
- Avoid accessing `window` or `localStorage` in server components.
- Use dynamic imports for browser-only libraries (e.g. Excalidraw).

### Accessibility

- Use semantic HTML for headings, lists, and buttons.
- Ensure icons used as buttons have accessible labels or tooltips.

## Workflow Expectations

- Keep changes minimal and scoped to the request.
- Update README or docs only when required.
- Do not add new dependencies unless required by the task.
- Do not add tests if no test system exists, unless explicitly requested.

## Linting and Quality

- Run `npm run lint` for changes that affect UI or logic.
- Fix lint warnings if they are introduced by your changes.
- Follow ESLint rules from `eslint-config-next`.

## File Conventions

- Avoid index barrels unless already used.
- Use `page.tsx` and `layout.tsx` under `app/` routes.
- Keep hooks in `hooks/` when shared across features.

## Example Patterns

- `useCallback` for handlers passed to child components.
- `useMemo` for derived values from store state.
- `useRef` for DOM or Excalidraw references.
- `nanoid` for client-side identifiers.

## Notes for Agents

- The project currently stores all data in localStorage.
- Ensure updates preserve existing persistence behavior.
- Do not introduce server-side storage without explicit request.
- Keep the UX minimal and professional, matching existing UI.
