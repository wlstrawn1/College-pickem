# College Pick'em V7.0.5 — Commissioner Entry Cleanup

This build adds safe submission cleanup directly inside the Commissioner Entry Check.

Changes:
- Adds a Submitted Entries list for the currently selected week.
- Shows player name, email, submission source, and submission time.
- Adds a red **Delete Entry** button for each submitted entry.
- Requires a confirmation before deleting.
- Deleting permanently removes that week's picks and tiebreaker from Firestore.
- Weekly Tracking, Season Leaderboard, Season History, and commissioner counts refresh after deletion.
- Historical imported entries can also be deleted from the same screen.
- Improves the commissioner submitted-player matching so historical entries linked by email count correctly.
- Keeps all V7.0.4 historical import and V7.0.3 naming changes.

Upload/replace:
- index.html
- styles.css
- app.js
- college-pickem-newspaper-banner.png
- README.md

Firestore rules are unchanged from V7.0.4. Existing admin rules already allow commissioners to delete weekly entries.
