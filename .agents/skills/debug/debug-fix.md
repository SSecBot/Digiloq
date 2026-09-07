# Debugging & Bug Fixing Protocol (`debug-fix.md`)

This document defines non-negotiable guidelines, root-cause analysis procedures, side-effect prevention policies, and surgical code modification standards for AI agents (Claude Code, Antigravity) and developers.

---

## 1. Root Cause Analysis (RCA) & Investigation Phase

* **Read Logs & Traces Carefully:** Examine error messages, full stack traces, and exact source code line numbers before attempting any edits.
* **Identify Execution Context:** Determine exact trigger conditions: Which input payloads, user roles, environment variables, or edge-case workflows caused the failure?
* **Zero Speculative Guesswork:** Never write code based on assumptions like "it's probably here." Use targeted logging or breakpoint tracing to isolate the exact root cause before touching application logic.
* **Immediate Code Editing Ban:** Never start writing replacement code, deleting files, or refactoring un-related lines immediately upon receiving an error trace. Analyze first, isolate second, execute third.

---

## 2. Root Cause Resolution vs. Symptom Masking

* **Solve Root Cause, Not Symptoms:** Never mask errors or bypass checks just to suppress an exception.
* **Banned Catch-and-Swallow Pattern:** Wrapping crashing logic in empty `try-catch` blocks or returning default dummy values to suppress errors is strictly forbidden. Fix the null reference, unawaited promise, or logical flaw at its origin.

```typescript
// DON'T: Masking the symptom with empty try-catch or silent swallowing
try {
  const result = await fetchUserData(user.id);
  return result.profile.name;
} catch (e) {
  // Silent error swallowing - FORBIDDEN
  return "";
}

// DO: Fix root cause with explicit null checks and error handling
if (!user?.id) {
  throw new IllegalArgumentException("User ID is required to fetch profile.");
}
const result = await fetchUserData(user.id);
if (!result?.profile) {
  throw new NotFoundException(`Profile not found for user ID: ${user.id}`);
}
return result.profile.name;