# HSR Frontend

Frontend for the HSR training simulator (React + Vite).

## Features

- Main landing page and project parameter flow.
- Game simulator page with gantt and resource controls.
- Results page with score breakdown, timeline and prioritized recommendations.

## Run locally

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

## Key files

- `src/App.jsx` - app routes and shell.
- `src/pages/ResultPage.jsx` - results screen UI.
- `src/pages/ResultPage.css` - styles for results screen.
- `src/data/resultMock.js` - mock data for results screen.
- `src/index.css` - global styles and design tokens.
