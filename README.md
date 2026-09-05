# College Pick'em V6.4.0 — Automatic Scores + ATS Grading

This version removes normal manual result entry from the weekly workflow.

## Automatic behavior
- Pulls college-football scoreboard data from ESPN's public scoreboard feed.
- Matches the site's weekly games to ESPN events by team name.
- Displays scheduled/live/final status and current scores.
- Automatically calculates the ATS winner when a game is final using the spread saved with that week's game.
- Recalculates Tracking automatically.
- Recalculates the Season Leaderboard from automatically graded real weeks.
- Refreshes every 60 seconds while the Tracking or Results tab is open.
- "Refresh Scores" forces an immediate refresh.

## Manual backup
Commissioner result controls remain under Admin as **Manual Result Overrides (Backup)**. They are only needed when an external feed cannot match a game or if a correction is necessary.

## Important
This is still a static Firebase-hosted site. Automatic scores are fetched in the browser while the site is open; no paid sports API key is required and no Firebase Cloud Function deployment is required for this version.

## Upload / replace
- index.html
- styles.css
- app.js
- cfb-pickem-banner.png
- README.md
- firestore.rules

Firestore rules are unchanged from V6.3.0.
