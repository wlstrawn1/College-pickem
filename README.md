# College Pick'em V7.0.2 — New Newspaper Hero Banner

This release keeps all V7.0.1 Season Hub, Tracking, Admin, ESPN, and Player Directory functionality and replaces the public hero artwork with the new College Pick'em newspaper-style season banner.

## What changed

- Replaced the SEC stadium hero with the new full-season College Pick'em newspaper artwork supplied by the commissioner.
- Uses a brand-new asset filename (`college-pickem-newspaper-banner.png`) so GitHub Pages and browser caches fetch the new image immediately.
- The hero still uses the full-image/no-crop behavior from the prior build.
- Bumped CSS/app cache versions and the visible build badge to V7.0.2.
- No changes to scoring, ESPN imports, Tracking, Leaderboard, Season History, Player Directory, authentication, or Firestore rules.

## Upload / replace

- index.html
- styles.css
- app.js
- college-pickem-newspaper-banner.png
- firestore.rules
- README.md

The older banner image files may remain on the host; V7.0.2 no longer references them.
