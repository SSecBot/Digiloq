# Workflow: Production Release

## Objective
Manages the end-to-end process of preparing, verifying, and executing a deployment or release to the production environment safely and without regressions.

## Steps
1. **Pre-flight Check & Status Analysis:**
   - Verify that the target branch/commit is up to date and all staging/CI tests are fully passing (green).
   - Check environment configurations, release notes, and version changes (e.g., `package.json`, `CHANGELOG.md`).
2. **Release Plan (Mandatory):**
   - Directly triggering a production deploy is **FORBIDDEN**.
   - Present a clear release plan detailing:
     - The scope of changes included in this release.
     - Any required environment variables, database migrations, or third-party service updates.
     - A **rollback strategy** in case the deployment fails.
   - **Wait for my explicit approval** before proceeding with the deployment.
3. **Execution:**
   - Once approved, run the project's release, build, or deployment scripts/skills.
4. **Post-Deployment Verification:**
   - Run health checks, smoke tests, or critical path verifications on the production environment.
   - Monitor logs or error tracking systems for any immediate anomalies.
5. **Handoff:**
   - Provide a final release summary, including version numbers, deployed artifacts, and status confirmation.