# College Pick'em V6.2 — Dashboard Layout + Game Selection Fix

This build is intended to match the approved dark dashboard mockup much more closely.

Changes:
- Smaller hero image positioned at the upper-left instead of a full-width banner.
- College Pick'em title/navigation aligned beside the image.
- Three dashboard summary cards: Week Selector, Welcome/Season stats, Test Mode.
- Full-width Week Games panel with matchup rows and ATS pick buttons.
- Game selection rows restored even when the existing Firestore Week 1 document does not contain a `games` field.
- Existing Week 1 static slate is used as a fallback.
- GOTW tiebreaker remains below the game list.
- Footer added for league info/help/account context.
- Responsive layout for laptops and mobile.
- Cache/version bumped to v6.2.

Upload to GitHub:
- index.html
- styles.css
- app.js
- cfb-pickem-banner.jpeg
- README.md

Firestore rules are unchanged from V6.
