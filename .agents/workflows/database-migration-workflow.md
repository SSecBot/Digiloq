# Workflow: Database Migration

## Objective
Manages the process of creating, applying, and verifying database schema changes or data migrations safely without causing data loss or downtime.

## Steps
1. **Schema & Model Analysis:** Inspect current database schemas, models, and previous migration files to understand the current state.
2. **Migration Plan (Mandatory):** 
   - Directly writing or executing a migration is **FORBIDDEN**.
   - Present a clear plan detailing:
     - The exact schema/table/column changes.
     - The generated migration script preview.
     - A **rollback strategy** (how to revert the change if it fails).
   - **Wait for my approval** before executing.
3. **Execution:** Once approved, run the project's migration tools/skills to apply the migration.
4. **Verification:** 
   - Verify that the migration applied successfully without errors.
   - Run database-related tests or check model mappings.
5. **Handoff:** Provide a summary of the migration file name, path, and notes on how to roll back if necessary.