# College Pick'em V7.0.19

My Picks scorecard.

Changes:
- "My Picks" is now a real scorecard: points earned vs. max possible finish, W-L(-P) record, and a live points bar (won / missed / on the board).
- Added an "On The Board" section listing your still-pending picks with the spread, point value, and kickoff time.
- Added a "Graded" section showing final scores and how each pick did ("Won by X.5" / "Missed by X.5" / "Push"), plus points earned per game.
- Opening the My Picks tab now pulls the latest ESPN scores automatically (same feed Weekly Tracking uses), so it stays current during game days.
- Fixed: the Weekly Champion banner (Weekly Tracking tab) rendered a player's display name into the page without escaping it — a specially crafted display name could have injected HTML/JS. Now escaped like the rest of the app.
- Includes all V7.0.18 functionality.

No Firestore rules changes are required.
