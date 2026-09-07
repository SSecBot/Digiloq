# Database Schema & Migration Standards (`database-schema.md`)

This document defines mandatory database engine rules, ORM setup, constraints, index strategies, and migration policies for AI agents and developers.

---

## 1. Database Engine & Encoding Configuration

* **Database Engine:** PostgreSQL `v16.x` (or Supabase / Neon managed Postgres).
* **ORM / ODM Tool:** Prisma ORM `v5.x` / `v6.x` or Drizzle ORM.
* **Character Set & Encoding:** `UTF-8` (`utf8mb4` equivalent in Postgres).
* **Timezone:** Always store timestamps in `UTC` (`TIMESTAMP WITH TIME ZONE`).

---

## 2. Primary Keys & Data Types

* **Primary Keys:** Use `UUIDv4` or `CUID2` string keys for web-exposed entities to prevent ID enumeration. Use auto-incrementing `BIGINT` only for high-throughput internal logs.
* **Enums:** Explicitly define schema-level Enums for finite state properties (e.g., `UserRole`, `TransactionStatus`).
* **Text Strings:** Use `VARCHAR(n)` with length limits for bounded inputs (emails, titles); use `TEXT` only for rich body content.

```prisma
// Example Schema Definition (Prisma)
enum UserRole {
  ADMIN
  USER
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique @db.VarChar(255)
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @db.Timestamptz
}