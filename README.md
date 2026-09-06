# College Pick’em V7.0.10 — Historical Week 1 Import Hardening

This build fixes the Week 1 Google Forms import when the Week 1 game objects stored in Firestore use a different order or slightly different team labels.

Changes:
- Parses the original 20 Week 1 Google Form questions against the fixed historical Week 1 slate.
- Maps those historical games to the current Week 1 Firestore games by game ID first, then by team identity.
- Converts each historical pick to the exact favorite/underdog string used by the stored Week 1 card.
- Keeps support for the single combined Clemson/LSU tiebreaker field.
- Ignores appended non-submission summary rows.
- Gives a specific warning to use “Load Week 1 Games” only if the stored Week 1 card is actually missing a historical matchup.
- Uses new JS/CSS filenames to prevent a cached older importer from running.
- All V7.0.8 features remain.

No Firestore rules change is required.


## V7.0.10 fix
- Historical Week 1 importer now includes an explicit resolver for every code used by the original 2026 Google Form.
- Covers CLEM/LSU, UM/WMU, UF/FAU, UCLA/CAL, WAS/WSU, and every other Week 1 response code.
- Preview errors now include the raw unrecognized value for easier diagnosis.
- Preview displays the historical importer version so browser-cache issues are easy to spot.
