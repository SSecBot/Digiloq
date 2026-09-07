# Code Review Protocol & Skill (`code-review.md`)

This skill file defines mandatory code review procedures, architectural validation, threat screening, performance checks, and exact file-line violation reporting standards for AI agents (`@skill:code-review`) and developers.

---

## 1. Execution Criteria & Strict Rules

* **No Generic Praise or Fluff:** Reviews must be concise, objective, and actionable. Avoid generic fluff or broad statements like "Looks good overall!" without backing telemetry.
* **Mandatory File-Line References (`file:line`):** Every detected security flaw, architecture violation, `any` usage, or performance issue MUST be explicitly cited with its exact file path and line number (e.g., `src/services/user.ts:42`).
* **Rejection Threshold (`Changes Requested`):** If a critical security vulnerability (SQL Injection, XSS, leaked secret) or architectural layer violation (DB access inside UI/Controller) is detected, the reviewer MUST reject the review with **`Changes Requested`** and provide a concrete fix snippet.

---

## 2. Review Checklist Categories

### A. Architectural & Layering Isolation
* **Layer Violations:** Database/ORM queries (`db.query`, `prisma.findMany`) MUST NOT exist inside UI components (`.tsx`), Controllers, or Route Handlers directly. They must be isolated inside the `Repositories` layer.
* **Dependency Directions:** Higher-level domain modules must not import lower-level infrastructure details directly without interface abstractions.

### B. Code Style & Naming Standards
* **Style Compliance:** Verify adherence to `code-style.md` (e.g., `camelCase` for variables/functions, `PascalCase` for components/types, `kebab-case` for file names).
* **Banned Constructs (Anti-Patterns):** Flag any usage of TypeScript `any`, deep `if-else` nesting (demand Early Return), or hardcoded strings/numbers (demand Enums/constants).

### C. Security & Secret Leakage
* **Hardcoded Credentials:** Scan for exposed API keys, secret tokens, private keys, or credentials committed inline.
* **Input Validation:** Ensure all external API inputs, query params, and form bodies are parsed via Zod/Joi schemas before processing.
* **SQL Injection & XSS:** Flag string-concatenated SQL queries or un-sanitized HTML rendering (`dangerouslySetInnerHTML`).

### D. Performance, Memory & Async Safety
* **N+1 Query Detection:** Flag database queries executed inside loops. Demand bulk `IN` or `JOIN` queries.
* **Frontend Re-renders & Memory Leaks:** Identify missing cleanup functions in `useEffect`, un-cleared `setInterval` timers, or missing `useCallback` wraps causing infinite re-render loops.
* **Error Handling:** Ensure async operations have `try-catch` blocks and forbid empty `catch` blocks that swallow errors silently.

---

## 3. Reporting Format & Code Fix Template

When reviewing code, use the following structural output format:

### Review Verdict: `Changes Requested` | `Approved`

#### Critical Issues & Security Violations
* **`file:line`** - **[Violation Type]**: Detailed description of the issue.
  * **Incorrect Code:**
    ```typescript
    // Line reference
    ```
  * **Suggested Fix:**
    ```typescript
    // Corrected replacement code
    ```

#### Anti-Patterns & Code Style Deviations
* **`file:line`** - **[Issue]**: Explanation of the code-style or type violation.

---

## 4. Code Review Examples

```typescript
// DON'T: Example of code that triggers "Changes Requested"
// File: src/controllers/userController.ts:15
export async function getUsers(req: Request, res: Response) {
  try {
    // VIOLATION: Direct DB call in controller + SQL Injection risk
    const users = await db.query(`SELECT * FROM users WHERE role = '${req.body.role}'`);
    res.json(users);
  } catch (e) {} // VIOLATION: Empty catch block
}

// DO: Corrected implementation suggested during review
// File: src/controllers/userController.ts:15
export async function getUsers(req: Request, res: Response) {
  try {
    const validated = QuerySchema.parse(req.body);
    const users = await userRepository.findByRole(validated.role);
    return res.json(users);
  } catch (error) {
    logger.error("Failed to fetch users", { error });
    return res.status(500).json({ error: "Internal server error" });
  }
}