# Commit & Pull Request Standards (`commit-pr.md`)

This document defines mandatory guidelines for commit messages, pre-commit code verification checks, Git branch safety rules, and Pull Request (PR) descriptions for AI agents (Claude Code, Antigravity) and human developers.

---

## 1. Mandatory Pre-Commit Verifications

Before generating or committing any code changes, the following checks MUST run and pass cleanly:

1. **Linting & Formatting:** Pass all ESLint, Prettier, or project-specific formatting tools without errors or unresolved warnings.
2. **Automated Unit Testing:** Execute the test suite (e.g., `npm test`, `pnpm test`, or `vitest run`) to guarantee no existing functionalities break.
3. **Secret & Leak Scanning:** Ensure no temporary credentials, hardcoded API keys, passwords, or leftover debugging calls (`console.log`, `debugger`, `print()`) remain in the codebase.

```bash
# DON'T: Committing dirty code with console logs or broken tests
git commit -m "fix stuff"

# DO: Verify code passes linting, tests, and secret checks before committing
pnpm lint && pnpm test
git commit -m "fix(auth): resolve session token expiration check"