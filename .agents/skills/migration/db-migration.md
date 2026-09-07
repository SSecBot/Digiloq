# Database Migration & Schema Evolution Guidelines (`db-migration.md`)

This document defines non-negotiable standards, safety procedures, destructive command bans, rollback strategies, and backward-compatible migration practices for AI agents (Claude Code, Antigravity) and developers.

---

## 1. Migrator Tooling & Command Standards

* **ORM / Migrator Standard:** Prisma ORM (`npx prisma migrate`) or Drizzle ORM (`npx drizzle-kit`).
* **Explicit Execution Commands:**
  * **Development Migration:** `npx prisma migrate dev --name <migration_name>`
  * **Production Migration:** `npx prisma migrate deploy`
  * **Status & Drift Check:** `npx prisma migrate status`
* **Direct Production Modification Ban:** Altering database schemas manually in production via raw SQL clients, admin dashboards, or un-tracked scripts is strictly forbidden. All schema changes must be driven by migration files tracked in Git.

```bash
# DON'T: Manual execution or bypass in development/production
npx prisma db push --accept-data-loss # Danger in shared environments

# DO: Tracked, named migration generation
npx prisma migrate dev --name add_default_to_user_status