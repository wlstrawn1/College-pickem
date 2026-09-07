# College Pick'em V7.0.51

Edit a single player's picks directly.

What's new:
- Admin tab → Submitted Entries → each row now has an "Edit Picks" button alongside "Delete Entry."
- Clicking it opens an editor right there with a dropdown per game (No Pick / dog / favorite), pre-filled with their current pick, plus their Game of the Week tiebreaker prediction if this week has one.
- Save writes directly to that player's entry — no CSV, no re-import, no risk of the synthetic-ID duplication issue that comes with re-running the historical import. Works for both real accounts and still-unlinked historical entries, and works regardless of whether the week is locked, since this is an admin action.
- Season Leaderboard, Weekly Tracking, and (if you're editing your own current week) My Picks all refresh automatically after saving.
- Includes all V7.0.50 functionality (bulk-clear entries for a whole-week reimport).

No Firestore rules changes are required — admin write access to any entry, regardless of lock state, was already covered by the existing rules.
