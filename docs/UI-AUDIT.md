# VoxOpus UI audit, 7 October 2026

Scope: existing manual task workflow. Audience confirmed by the user: students; calm, focused, approachable. No new features. Locations below refer to the pre-edit source unless labeled current.

## Impeccable
Installed with `npx impeccable install`. Followed `/impeccable init` by reading its instructions and recording confirmed context in `frontend/PRODUCT.md`. `npx impeccable detect .` exited successfully without printed findings. The installed engine's explicit scans of `frontend/src --json`, before and after edits, both returned `[]`. No detector findings were added or suppressed. This is not proof of accessibility: manual inspection found the issues below.

## Instances and fixes

| Original location | Finding | Resolution |
| --- | --- | --- |
| frontend/src/index.css:14,15 | Roboto fallback for both body and headings | Readable Avenir Next/Segoe UI body stack; compact upright Palatino product heading |
| frontend/src/index.css:7,8,9,40,41,42 | Generic purple accent tokens, unused by the live task UI | Forest green primary, rust accent, cool gray neutrals |
| frontend/src/App.css:20,30,41,49 | Unused decorative layered Vite hero | Removed obsolete stylesheet rules |
| frontend/src/App.css:128,131 | Unused animated hover shadow | Removed; static color feedback on working controls |
| frontend/public/favicon.svg:1 | Live purple Vite logo with gradient/blur treatment | Replaced with a flat green task check favicon |
| frontend/src/index.css:53,57,76 | Centered starter shell and 56px heading overwhelmed an operational form | Left-aligned compact header and asymmetric form/list layout |
| frontend/src/components/CreateTaskForm.tsx:38,48,57,66 | Ungrouped fields and action without spacing | Shared form styles, optional scheduling fieldset, separated commit action |
| frontend/src/components/EditTaskForm.tsx:50,59,68,77 | Same grouping issue in correction workflow | Same grouped schedule fields and clear Save/Cancel actions |
| frontend/src/components/TaskItem.tsx:38,51,59,61,65 | Title, dates, completion, and actions lacked visual grouping | Divided rows with adjacent actions and readable date metadata |
| frontend/src/index.css:18 and form/control components | Browser-default control text did not explicitly inherit 16px body minimum | `input, button { font: inherit }`, root 16px |
| frontend/index.html:7 | Browser title “frontend” | Product-specific title |

The purple accent alone was not a purple-to-blue gradient; the actual decorative gradient treatment was in the starter favicon. Dormant CSS is distinguished from visible problems above.

## All 15 requested checks

1. Purple/indigo-to-blue gradients: no live section gradient; removed starter favicon treatment and unused purple tokens.
2. Inter/Geist/Roboto everywhere: replaced Roboto stacks.
3. Gradient text: absent, remains absent.
4. Pill badge above headline: absent, remains absent.
5. Glowing halos/spotlights: no live section halos; removed blur-heavy starter favicon.
6. Glassmorphism: absent, remains absent.
7. Icons in rounded squares above headings: absent, remains absent.
8. Identical card grids: absent; task rows use simple dividers.
9. Cards inside cards: absent; scheduling uses a borderless semantic fieldset.
10. Thick colored side stripes: absent, remains absent.
11. Giant context-free stats: absent, remains absent.
12. Arbitrary tiny numbered labels: absent, remains absent.
13. Pulsing/bouncy/zooming/scrolling decoration: absent in live UI; removed dormant hover-shadow animation.
14. Generic promotional copy/em dashes: absent; product copy states tasks and reminders plainly.
15. Beige/cream plus oversized italic serif: absent; cool neutrals with a modest upright product heading.

Unused starter assets (`assets/vite.svg`, `assets/react.svg`, `assets/hero.png`, `public/icons.svg`) remain unreferenced. They are not shipped UI content and were left as repository assets rather than deleted.

## Readings and study implications

- Audio and Speech Interaction lecture, PDF pages 4–12, 31–43, 49–54, 65: explicit signifiers, short guided input, timely feedback, and correction through another modality. This pass keeps plain visible labels, grouped dates, and direct manual editing. Speech feedback and microphone states are future implementation work, not simulated controls.
- JustShape (3772318.3790641.pdf), sections 5–7, especially 7.2–7.3.1: visible processing feedback and hybrid manual refinement. Applied only as a design analogy supporting user control. CAD study results do not validate a student task manager.
- User-defined study notes, PDF pages 4 and 6: examples of creating an appointment and correcting its date, including alternate phrasings. Keep date information visible and Edit adjacent to the task. Pages 5 and 7 contain task headings without recorded responses; no sample size or full results are supplied. Do not infer consensus or implement gestures/calendar features from those headings.
- Project outline: preserve small scope and manual correction. Speech/LLM features described there remain future work.

## Verification and intentional choices

Frontend lint and build pass after building the shared workspace first. Browser checked at 1280×800 and 390×844: no horizontal overflow; desktop columns 340px/644px, mobile one 350px column. Created a disposable task, edited and saved it, marked it complete, and deleted it. Inspected both layouts visually. Test task removed.

Calculated contrast: main text/background 11.90:1; muted text/background 5.87:1; placeholder/white 6.37:1; white/primary 8.45:1; rust/white 6.79:1. Text and input/button fonts are 16px minimum. Buttons are at least 44px high; checkbox has a clickable label at least 44px high. Field grouping uses 8px gaps, optional schedules 16px top spacing, sections 40–56px apart. CSS includes purpose comments for each group.

Kept intentionally: native date/time pickers for precision; small control radii for familiar affordances; repeated list rows for scanning; green completion check plus strike-through (status does not rely on color); an upright serif only for the 32px product name; existing reminder alerts and local storage behavior. None of the 15 patterns is retained as decorative page structure. A single light palette is intentional for this pass; no theme feature was added. OS-native date picker internals are browser-controlled and not fully audited. Reminder timing itself was not exercised in this visual pass.

Dependency install reported one high-severity advisory; dependency upgrades were outside this UI-only pass.
