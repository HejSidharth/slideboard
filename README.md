# SlideBoard

SlideBoard is a minimal presentation tool that combines a slide deck with Excalidraw whiteboards. Each slide is an interactive canvas, making it well suited for tutoring, problem solving, and live teaching.

## Features

- Slide-based workflow with Excalidraw whiteboards
- Create, duplicate, reorder, and delete slides
- Presentation mode for full-screen delivery
- Auto-save to localStorage
- Import and export presentations as JSON
- Optional AI assistant sidebar powered by OpenRouter
- Light and dark themes

## Tech Stack

- Next.js (App Router)
- React
- Tailwind CSS
- shadcn/ui
- Excalidraw
- Zustand
- @dnd-kit

## Requirements

- Node.js 18 or newer
- npm, yarn, pnpm, or bun

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown in your terminal (usually `localhost` on port `3000`).

## Usage

### Create a presentation

- From the homepage or dashboard, click "Create presentation" to start a new deck.
- Rename the deck from the toolbar.
- Add or duplicate slides as needed.

### Draw on slides

- Each slide contains an Excalidraw canvas.
- Changes are saved automatically.

### Present

- Click the "Present" button to enter presentation mode.
- Use on-screen controls or keyboard shortcuts to navigate.

### Export and import

- Export a deck from the toolbar to download a JSON file.
- Import a previously exported file from the dashboard.

### AI assistant (optional)

The chat assistant uses OpenRouter through a server-side API route.

1. Copy `.env.example` to `.env.local`.
2. Set `OPENROUTER_API_KEY` in `.env.local`.
3. Set `OPENROUTER_MODEL` in `.env.local` (for example, your preferred free model id).

## Build

```bash
npm run build
npm run start
```

## Configuration

All deck data persists in localStorage. The assistant requires server env vars in `.env.local`.

## Contributing

Issues and pull requests are welcome. Please keep changes focused and include relevant context in descriptions.

## License

This project does not currently specify a license.
