## 2024-04-25 - Missing ARIA Labels on Inline Edit Buttons
**Learning:** Inline edit actions that rely solely on icons (e.g., `<Check>` and `<X>`) within `<Button>` components lack semantic meaning for screen reader users, causing accessibility barriers during inline editing workflows.
**Action:** Always include descriptive `aria-label` attributes on icon-only buttons, especially within inline edit forms (e.g., `aria-label="Save changes"` or `aria-label="Cancel editing"`).
