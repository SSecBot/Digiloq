# Technology Stack & Package Rules (`tech-stack.md`)

This document defines explicit version constraints, frontend/backend stack choices, state management rules, and mandatory package management directives for AI agents (Claude Code, Antigravity) and developers.

---

## 1. Primary Runtime & Language Specs

* **Programming Language:** TypeScript `v5.x` (Strict Mode enabled).
* **Runtime Environment:** Node.js `v20.x` (LTS release).
* **Package Manager:** **`pnpm` exclusively.** 
  * *Constraint:* Never use `npm` or `yarn` commands under any circumstances. All packages must be installed using `pnpm add <package>` or `pnpm add -D <package>`.

```bash
# DON'T
npm install zustand
yarn add zustand

# DO
pnpm add zustand
pnpm add -D @types/node