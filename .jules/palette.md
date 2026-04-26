## 2024-04-22 - Missing ARIA Labels on Inline Editing Buttons
**Learning:** Found that inline editing forms in portfolio preview commonly use icon-only buttons (Check/X icons) for saving and cancelling edits. These lack `aria-label`s, making them completely inaccessible to screen readers, which will just read "button".
**Action:** Always add explicit `aria-label` attributes to icon-only action buttons, particularly in repeating elements or inline forms.
