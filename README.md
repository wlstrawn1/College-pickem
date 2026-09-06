# College Pick'em V7.0.46

Visible Tiebreak column in Weekly Tracking.

Changes:
- Added a real "Tiebreak" column to the Weekly Tracking table (replacing the old hover-only tooltip, which never worked on mobile anyway).
- It only shows a value when the tiebreak actually decided a top-3 finish: players are grouped by raw score, and if a score-tie group has anyone ranked 1st, 2nd, or 3rd, everyone in that group gets their tiebreak error and predicted score shown — including whoever the tiebreak nudged just outside the top 3, so it's clear why. Everyone else (not part of a top-3-deciding tie) shows a plain dash, so the column stays useful instead of noisy.
- Includes all V7.0.45 functionality (signup email guidance note).

No Firestore rules changes are required.
