# Task analysis (instead of user research)

No real users were available (skill `ext-ux-research`, evaluative study → here **analytic**).
Method: the five core tasks from DESIGN.md §14 / SPEC §4, broken into individual interactions (tap/click =
one interaction, typing into a field = one interaction), before (commit `23dc0b3`) and after (“Hallenlicht”),
each for phone (Pixel 7, 412 × 915) and desktop (1280 × 800). Scrolling is counted separately because it costs
time on phones and is often forgotten.

| #   | Task                                                     | Phone before                                             | Phone after                                                     | Desktop before | Desktop after |
| --- | -------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | -------------- | ------------- |
| 1   | **Confirm training** from the alarm                      | 1 tap                                                    | 1 tap                                                           | –              | –             |
| 1b  | … from app start (in-app question appears)               | 1                                                        | 1                                                               | 1              | 1             |
| 1c  | … from the Start page without the question               | 1                                                        | 1                                                               | 1              | 1             |
| 2   | **Backfill**: confirm 20 past sessions                   | 3 (Offen tab, select all, “Alle markierten: gehalten”)   | 3 (“Alle 20 offenen bestätigen”, select all, “Gehalten”)        | 3              | 3             |
| 3   | **Create series** (U12, Tue/Thu 18:00–19:30 since 1 Sep) | 9 interactions, 1× scrolling                             | 9 interactions, 1× scrolling                                    | 9              | 9             |
| 4   | **Change appointment** “only this one” (place)           | 6 (Mehr → Termine, date, field, Speichern, “Nur dieser”) | 5 (Termine, date, field, Speichern, “Übernehmen”, radio preset) | 5              | 5             |
| 4b  | … “this one and all following”                           | 6                                                        | 6 (+1 to choose the radio card)                                 | 5              | 6             |
| 5   | **Create report**                                        | 3 (Mehr → Export → PDF) or 2 + scrolling                 | 2 (“Antrag erstellen” at the top, PDF)                          | 2              | 2             |

**Acceptance DESIGN.md §14:** confirm from the alarm **1 tap** ✓, from app start **≤ 2 taps** ✓ (1 tap via question
or start card). Create a new series ≤ 30 s: 9 interactions, time fields with native pickers, weekday chips
48 px – in the analytic estimate (KLM: ~2 s per field incl. typing, 0.4 s per tap) about 22 s.

## What changed qualitatively

- **Fewer mistakes instead of fewer taps:** every status change (Ja/Nein, bulk actions) gets a
  “Rückgängig” toast (6 s). Before, a mistaken tap could only be fixed through the edit dialog (4–5 interactions).
- **Series scope** is now a radio card with one line of explanation each. “Dieser und alle folgenden” costs
  one tap more, but the default “Nur dieser Termin” is preselected and the effect of each option is visible
  before saving (heuristic: error prevention).
- **Termine** moves from “Mehr” into the bottom bar (−1 tap on the phone); **Offen** is reachable via the
  start card and the yellow badge, and on phones also in “Mehr”.
- **Report:** the button sits in the page header on Start (visible without scrolling); from 1 Dec plus a banner.
- **The one question** on Start (yellow card) is visible on a Pixel 7 without scrolling.

## Open (not measured)

Real time measurements with users, discoverability of “Mehr” for first-time users, and comprehension of the
term “Serie” vs. “Training” should be checked in a short guerrilla test with 3–5 coaches.
