# College Pick'em V7.0.6 — Lock Countdown + Admin Gate

This build adds the live pick-lock countdown and hardens the Commissioner login flow.

Changes:
- Adds a live **PICKS LOCK IN** countdown to the Week Selector card.
- Adds the same countdown immediately above the Submit Picks button.
- Countdown updates every second and uses the published Central Time lock timestamp.
- When the deadline hits, the countdown changes to **LOCKED** automatically.
- Pick buttons, tiebreaker inputs, and edit controls lock immediately without requiring a page refresh.
- Picks status changes from **PICKS OPEN** to **PICKS LOCKED** automatically.
- Commissioner login now verifies the Firestore user role *before* loading the normal app UI.
- Any account without `role: "admin"` is immediately signed back out and shown **This account is not authorized as a commissioner.**
- Clicking Commissioner Login never grants permissions; Firestore admin rules remain the real security boundary.
- Keeps all V7.0.5 commissioner entry cleanup and V7.0.4 historical import features.

Upload/replace:
- index.html
- styles.css
- app.js
- college-pickem-newspaper-banner.png
- README.md

Firestore rules are unchanged from V7.0.5 / V7.0.4.
