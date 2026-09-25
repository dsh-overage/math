# NUMEN — Mathematical Intelligence

A dependency-free adaptive mathematics learning system that teaches a method first, works through an example, coaches one guided problem, and only then moves to independent practice.

## What is implemented

- **16 guided lessons** across 8 practical math skills
- Four-phase teaching loop: **Understand → Worked Example → Solve Together → Independent Practice**
- Adaptive **Daily Mission** (12 problems)
- 8-skill **Diagnostic** calibration
- **Speed** protocol with a 60-second timer
- **Weakness Attack** targeting the two lowest mastery ratings
- **Boss Fight** with harder mixed problems
- Mental Math, Percentages, Financial Math, Logic, Algebra, Probability, Statistics and Data/IT Math generators
- Per-skill mastery ratings (0–100)
- XP, levels, streaks, accuracy and session history
- Explanations + hints after each problem
- Local persistence with `localStorage`
- Responsive desktop/mobile layout
- Lightweight PWA caching when served over HTTP(S)

## Run

Simplest: open `index.html` in a browser.

For PWA/service-worker behavior, serve the folder locally, for example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Verify core logic

```bash
node tests/core.test.js
```

## Product approach

The UX deliberately combines ideas seen in strong open-source learning/productivity projects rather than cloning one product:

- **Exercism**: visible track/mastery progress and short practice loops
- **Mathigon Studio**: interactive, explanation-first mathematics experience
- **Habitica**: XP/streak feedback and repeatable daily loop
- **developer-roadmap / roadmap.sh lineage**: skill-map mental model
- **Plane**: restrained dark product UI, compact navigation and information density

The implementation and visual system in this repository are original and dependency-free.
