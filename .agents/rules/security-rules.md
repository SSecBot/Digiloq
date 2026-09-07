# Application Security & Hardening Rules (`security-rules.md`)

This document defines non-negotiable security rules, threat mitigation standards, and coding practices required for AI agents (Claude Code, Antigravity) and developers.

---

## 1. Environment Variables & Secret Hygiene

* **Hardcoding Ban:** Absolutely NO API keys, database credentials, JWT secrets, or private tokens may be hardcoded in application source code.
* **Environment Files (`.env`):** All sensitive settings and secrets must be loaded from `.env` files.
* **Version Control Exclusion:** `.env` and `.env.local` files MUST be included in `.gitignore` and never committed to Git history.
* **Template Requirement (`.env.example`):** A clean `.env.example` file containing required key names without real credentials MUST exist in the root repository.

```typescript
// DON'T
const dbPassword = "SuperSecretPassword123!";
const jwtSecret = "my_jwt_secret_key";

// DO
const dbPassword = process.env.DATABASE_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;