# College Pick'em V6.8.0 — Live Tracking + Entry Check

This version builds on V6.7.0 and adds the next live-pool improvements.

## New in V6.8.0
- Tracking now shows ESPN game status directly in each matchup header (scheduled, LIVE, or FINAL).
- Live/final scores appear in the Tracking matchup headers when available.
- Pick popularity appears after lock for every matchup, based on submitted league entries.
- Rank, Player, Score, and Max columns stay frozen while horizontally scrolling Tracking.
- Results now use clearer LIVE / FINAL / scheduled status badges.
- Commissioner dashboard now shows registered players, submitted entries, and exactly who still owes picks for the selected week.
- Added a Refresh Entry Status button for the commissioner.
- New submissions also store the player's email in the entry document for easier commissioner troubleshooting.

## Existing features retained
- ESPN weekly slate importer and draft builder.
- Automatic ESPN score / ATS grading while Tracking or Results is open.
- Manual result overrides as a backup.
- Week 1 built-in slate.
- Commissioner login with persistent browser session.
- Season leaderboard.
- Pickle Paper-inspired visual design and SEC banner.

## Upload / replace
- index.html
- styles.css
- app.js
- cfb-pickem-banner.png
- README.md
- firestore.rules

Firestore rules are unchanged from V6.7.0.
