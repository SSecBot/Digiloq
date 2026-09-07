# UI/UX Design System & Accessibility Guidelines (`ui-ux-design.md`)

This document defines non-negotiable frontend UI/UX standards, design tokens, responsive layout rules, loading states, and accessibility criteria for AI agents (Claude Code, Antigravity) and developers.

---

## 1. Palette Tokens & Typography Specifications

### Color Tokens
* **Base Background:** `#0F172A` (`bg-slate-900`)
* **Primary Text:** `#F8FAFC` (`text-slate-50`)
* **Primary CTA / Accent:** `#F59E0B` (`bg-amber-500` / `text-amber-500`)
* **Secondary Accent:** `#06B6D4` (`bg-cyan-500` / `text-cyan-500`)
* **Shadow / Elevation:** `#020617` (`shadow-slate-950`)
* **Muted / Secondary Text:** `#94A3B8` (`text-slate-400`)

### Typography Palette
* **Headings & Accents:** `font-mono` (JetBrains Mono Bold)
* **Body & Subtitles:** `font-sans` (Poppins Regular)

---

## 2. Strict Styling Constraints & UI Library Usage

* **Shadcn UI Primaries:** Never write basic UI primitives (Button, Modal, Input, Select, Dialog) from scratch using raw HTML/CSS. Always compose using existing Shadcn UI components.
* **No Inline Styles or Raw Hex Codes:** Inline `style="..."` attributes and arbitrary hex color codes (e.g. `bg-[#123456]`) are strictly forbidden. Use semantic CSS tokens (`bg-primary`, `text-muted-foreground`) or defined palette tokens. Hex `#ffffff` is the sole exception.

```tsx
// DON'T
<button style={{ backgroundColor: '#F59E0B', color: '#0F172A' }}>Click</button>
<div className="bg-[#0F172A] text-[#F8FAFC]">Content</div>

// DO
<Button className="bg-amber-500 text-slate-950 hover:bg-amber-600 font-mono">Click</Button>
<div className="bg-slate-900 text-slate-50 font-sans">Content</div>