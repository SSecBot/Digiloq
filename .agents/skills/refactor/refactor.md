# Refactoring Standards & Protocol (`refactor.md`)

This document defines non-negotiable behavior preservation rules, complexity reduction standards, early return patterns, code cleanup constraints, and test validation protocols for AI agents (Claude Code, Antigravity) and developers.

---

## 1. Behavior Preservation & API Contract Safety

* **Strict Behavior Preservation:** Refactoring must strictly preserve existing external behavior, inputs, and outputs (the system contract). The sole purpose of refactoring is to enhance readability, maintainability, and execution efficiency without altering funcional outcomes.
* **API Signature Protection:** Never change public API interfaces, exported function signatures, parameter names/types, or return types while refactored internal logic is updated.
* **Adherence to Code Style:** Refactored code must strictly conform to existing project architectural rules defined in `code-style.md`. Do not invent new architectural layers or unapproved design patterns during a refactoring task.

```typescript
// DON'T: Changing function signature or return type during refactoring
// Original: (id: string) => Promise<User>
async function getUser(id: string, includeMetadata = true): Promise<UserWithMetadata> { ... }

// DO: Preserve original interface contract completely
async function getUser(id: string): Promise<User> {
  return userRepository.findById(id);
}