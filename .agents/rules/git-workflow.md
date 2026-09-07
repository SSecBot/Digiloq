# Git Workflow & Branching Rules (`git-workflow.md`)

This document defines mandatory Git branching models, commit message formats, Pull Request (PR) standards, and repository management constraints for AI agents and developers.

---

## 1. Branch Strategy & Structure

* **`main` / `master`:** Production-ready branch. Always stable and deployable. **Direct commits/pushes are strictly forbidden.**
* **`develop`:** Integration branch for the next release.
* **`feature/*`:** Branches for new feature implementations (e.g., `feature/auth-jwt`).
* **`bugfix/*` / `hotfix/*`:** Branches for fixing bugs (e.g., `bugfix/api-timeout`, `hotfix/login-crash`).

---

## 2. Conventional Commit Format

All commit messages must strictly follow the format: `<type>(<scope>): <short description>`

### Commit Types:
* **`feat`:** A new feature (e.g., `feat(auth): add JWT-based authentication`)
* **`fix`:** A bug fix (e.g., `fix(api): resolve user update error`)
* **`refactor`:** Code restructuring without changing external functionality
* **`docs`:** Documentation changes only
* **`test`:** Adding or updating test cases

```bash
# DON'T (Wrong)
git commit -m "fixed bug"
git commit -m "auth changes"

# DO (Right)
git commit -m "fix(api): fix null pointer exception on user profile update"
git commit -m "feat(auth): implement JWT token refresh strategy"