# College Pick'em V7.0.4 — Week 1 Historical Import

This build adds a commissioner-only bulk importer for the original Week 1 submissions.

## New
- Admin → Historical Data → Import Week 1 Submissions.
- Upload CSV/TSV exported from Google Sheets, or paste the table directly.
- Preview verifies every player, all 20 picks, and the Game of the Week score prediction before import.
- Existing Firebase player accounts link automatically by email when possible.
- Players who have not registered yet are stored as historical participants and still appear in Weekly Tracking, Season Leaderboard, Season History, and player cards.
- If a historical participant later creates an account with the same email, season calculations automatically merge that Week 1 history into the registered account.
- Re-import preview warns when an existing Week 1 entry would be replaced.
- Downloadable Week 1 CSV template included in the Admin interface.

## Firestore rules
The included firestore.rules file adds commissioner permission to create/update historical weekly entries. Publish these rules in Firebase before running the bulk import.

## Import workflow
1. Export the original Week 1 sheet as CSV (or copy/paste it from Google Sheets).
2. Admin → Historical Data → Import Week 1 Submissions.
3. Upload/paste the data.
4. Review the preview. Import stays disabled until all 20 picks and both tiebreak scores map correctly for every submission.
5. Click Import Week 1 Entries.

All V7.0.3 features remain unchanged.
