# College Pick'em V6.2.1 — Click/Interaction Fix

V6.2.1 fixes the homepage interaction failure introduced in V6.2.

Cause:
- The new dashboard removed the old `weekSelect` element.
- JavaScript was still trying to write to that missing element.
- That runtime error stopped the rest of the page JavaScript from initializing, which made the page appear unclickable.

Fix:
- `weekSelectTop` is now the single Week Selector used throughout the app.
- Navigation event binding is also tightened to actual tab buttons only.
- Cache/version bumped to v6.2.1 so GitHub Pages loads the corrected JavaScript.

Upload to GitHub:
- index.html
- styles.css
- app.js
- cfb-pickem-banner.jpeg
- README.md

Firestore rules are unchanged.
