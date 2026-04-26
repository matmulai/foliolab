## 2024-05-18 - Added ARIA Labels to Icon-Only Buttons
**Learning:** Icon-only buttons (e.g., shadcn/Radix `<Button>` wrapping `<Check>`, `<X>`, `<Plus>`) in inline editing flows lack context for screen readers.
**Action:** Always include explicit `aria-label` attributes to ensure screen reader compatibility when using icon-only buttons.
