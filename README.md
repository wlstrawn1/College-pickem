# College Pick'em V7.0.23

Whole banner + weekly rank/record.

Changes:
- Banner now shows the full image with nothing cropped off (switched `object-fit` from `cover` to `contain`). The banner box itself stays the same small size as v7.0.22 — the image now letterboxes within it (dark bars left/right) instead of having its top/bottom sliced off.
- The "Welcome" summary card now shows both season-long and current-week stats: Season Rank / Season Points / Season ATS stay as before, and a new section states the current week by name and shows Week Record and Week Rank for that week specifically.
- Week Rank respects the same privacy rule as Weekly Tracking: before the pick lock, it shows "Unlocks at lock" instead of a number, since ranking requires comparing against other players' still-hidden picks. After lock (or for the commissioner), it shows "#N of M".
- This card now refreshes every time you switch tabs, switch weeks, or submit picks, so it stays current "as you move between screens."
- Includes all V7.0.22 functionality.

No Firestore rules changes are required.
