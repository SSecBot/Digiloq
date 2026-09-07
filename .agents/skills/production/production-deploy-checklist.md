# Production Deployment Checklist (`production-deploy-checklist.md`)

This document defines non-negotiable pre-deployment verification steps, environment checks, performance optimizations, database backups, and health check validation rules for AI agents (Claude Code, Antigravity) and developers.

> **CRITICAL GUARDRAIL:** This checklist MUST be evaluated line-by-line before merging code to the `main` branch or deploying to production environments. If leftover `console.log` statements, development database connections, or unconfigured environment variables are detected, **ABORT THE DEPLOYMENT IMMEDIATELY** and report an explicit deployment blocker.

---

## 1. Environment Variables & Secret Hygiene

* **No Development Credentials:** Verify that `.env` files in production do NOT contain development/testing credentials, localhost URLs, or mock API keys.
* **Cryptographically Strong Secrets:** Ensure all production secrets (`JWT_SECRET`, `NEXTAUTH_SECRET`, `DATABASE_URL`, payment keys) use strong, unique production values.
* **Environment Variable Audit:** Validate that all key names listed in `.env.example` are populated in the production server environment.

```bash
# DON'T: Leftover development database connection or weak secret
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dev_db"
JWT_SECRET="secret123"

# DO: Production-ready environment configuration
DATABASE_URL="postgresql://prod_user:SecurePass2026!@ep-prod-db.host.tech/prod_db?sslmode=require"
JWT_SECRET="e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8"