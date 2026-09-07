# Code Style & Architecture Guidelines (`code-style.md`)

This document defines coding standards, architectural rules, and mandatory constraints for automated AI agents (Claude Code, Antigravity) and developers.

---

## 1. Explicit Technology & Tool Versions

* **Node.js:** `v20.x` (LTS)
* **TypeScript:** `v5.x` (Strict mode enabled)
* **Framework:** Next.js `14.x` / `15.x` (App Router)
* **Package Manager:** `npm` or `pnpm`
* **Formatting & Linting:** ESLint + Prettier

---

## 2. Core Software Design Principles

* **DRY (Don't Repeat Yourself):** Encapsulate duplicate logic into shared utilities or helper modules.
* **KISS (Keep It Simple, Stupid):** Avoid over-engineering. Implement the simplest readable solution that satisfies requirements.
* **Early Return Principle:** Eliminate deep `if-else` nesting. Return or throw early when conditions are met.
* **Immutable State:** Do not mutate objects or arrays directly (`mutate`); update state immutably using `spread`, `map`, or `filter`.
* **No Speculative Assumptions (Do Not Fabricate):** Never invent missing types, API endpoints, or requirements. Clarify or define explicitly.
* **Minimal Modification:** Apply surgical edits. Touch only code directly related to the requested feature or bug fix.

---

## 3. Type Safety & Secret Rules

* **Strict Ban on `any`:** Never use `any`. Use `unknown`, exact type interfaces, or generics (`T`) when types are dynamic.
* **No Hardcoded Secrets or URLs:** Never store credentials, API keys, secrets, or raw environment URLs inline. Use `.env` files.

```typescript
// DON'T
const apiUrl = "[https://api.example.com](https://api.example.com)";
function parseData(data: any) { return data.id; }

// DO
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
function parseData<T extends id: string { }>(data: T): string { return data.id; }