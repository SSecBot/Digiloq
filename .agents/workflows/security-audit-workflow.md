# Workflow: Security Audit & Vulnerability Scanning

## Objective
Manages the process of scanning codebases, dependencies, and configurations for security vulnerabilities, secrets leakage, and compliance issues, followed by a safe remediation plan.

## Steps
1. **Scope & Tool Selection:**
   - Identify the target scope (e.g., entire repo, specific modules, dependency tree, or configuration files).
   - Leverage the project's built-in security scanning skills/tools (e.g., static analysis, dependency audits, secret detectors).
2. **Analysis & Scanning:**
   - Run the security checks and analyze the output logs for high, medium, and low-severity vulnerabilities.
   - Look for common risks (e.g., hardcoded API keys/secrets, SQL injection points, unescaped user inputs, outdated vulnerable packages).
3. **Remediation Plan (Mandatory):**
   - Directly modifying critical security configurations or forcing major package upgrades without review is **FORBIDDEN**.
   - Present a structured security report detailing:
     - Identified vulnerabilities and their severity levels.
     - Proposed fixes or patches for each item.
     - Potential breaking changes or side effects of the patches.
   - **Wait for my approval** before applying any fixes.
4. **Execution & Patching:**
   - Once approved, apply the security patches or update vulnerable dependencies securely.
5. **Verification & Post-Audit:**
   - Re-run the security scans to confirm that vulnerabilities have been successfully resolved.
   - Run the standard test suite to ensure no regressions were introduced.
6. **Handoff:**
   - Provide a concise summary of resolved vulnerabilities, updated packages, and any remaining items requiring manual attention.