# CLAUDE.md

- Real app lives in nari/nari — repo root has a stale scaffold pending deletion
- Vite 5 + React 18 + TS, react-router-dom v6, CSS Modules only (NO Tailwind)
- Design tokens: nari/nari/src/styles/variables.css — single source of truth
- Serverless: api/ folder, Vercel conventions (see api/subscribe.ts) — deployed and working, do not move
- Secrets via process.env, never VITE\_-prefixed
- Commands: npm run dev / npm run typecheck / npm test — typecheck must stay green
- Build plan: read PLAN.md, execute milestone by milestone
