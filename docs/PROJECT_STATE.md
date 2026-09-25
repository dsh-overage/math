# Project State

## Current slice

The product now has a teaching-first vertical slice: a user can follow a guided lesson that explains a concept, shows a worked example, coaches a similar problem, and then moves into independent practice. Training modes remain available for reinforcement after understanding.

## Architecture

- `index.html` — application shell and training template
- `styles.css` — responsive visual system
- `core.js` — pure training engine, question generators, scoring and state normalization
- `lessons.js` — 16-lesson guided curriculum with concepts, rules, worked examples and coached problems
- `app.js` — browser UI, navigation, sessions, persistence and timers
- `manifest.webmanifest` + `sw.js` — install/offline-friendly shell when served over HTTP(S)
- `tests/core.test.js` — dependency-free Node smoke tests for the training engine

## Design principles borrowed from open-source references

1. Skill progress should be visible at a glance (Exercism / roadmap-style maps).
2. The next useful action should dominate the screen (daily loop instead of content catalog).
3. Gamification is feedback, not decoration: XP, streak and difficulty must map to actual practice (Habitica principle).
4. Mathematics should be interactive and explanatory, with hints before full explanation (Mathigon principle).
5. Product chrome should stay quiet, compact and dark so the problem itself has visual priority (Plane-inspired density).

## Next high-value work

- Add richer non-numeric interaction (drag/arrange, graphs, geometry, visual probability)
- Expand each skill from 2 lessons into a deeper concept tree with prerequisites and spaced reviews
- Build a larger problem bank with tagged misconceptions
- Add spaced-repetition scheduling per concept
- Add optional AI Socratic tutor endpoint
- Add weekly mastery trend snapshots (current state only stores present mastery + session history)
- Add import/export of local profile
- Add real install icons and GitHub Pages workflow
