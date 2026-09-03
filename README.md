# College Pick'em V6.2.3 — Full Banner Fix

This fixes the V6.2.2 banner layout.

The issue:
- The image itself was correct.
- The old CSS still constrained it to a small thumbnail width and positioned the page title beside it.

V6.2.3:
- Makes the vintage artwork span the full content width as a true banner.
- Shows the complete image with no intentional cropping.
- Moves College Pick'em title and navigation below the banner.
- Keeps all V6.2.1 interaction fixes and V6.2.2 artwork.

Upload/replace:
- index.html
- styles.css
- app.js
- cfb-pickem-banner.png
- README.md

Firestore rules are unchanged.
