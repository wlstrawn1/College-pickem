# College Pick'em V7.0.22

New banner, right-sized.

Changes:
- Swapped in the new mascot/conference-logo banner as the site hero image (compressed from a 2.3MB PNG to a 310KB JPG — same look, much lighter page load).
- Fixed the actual cause of the oversized banner: three stacked, conflicting CSS rules had accumulated over past versions (V6.7.0, V6.8.1, V6.8.2), and the last one used `!important` to force the hero to `height:auto` at its full native aspect ratio with no cap — that's why it kept growing to dominate the page regardless of screen size. Consolidated into one rule with a real height cap: roughly 90–150px on desktop, 100px on phones, scaling smoothly in between via `clamp()`.
- Removed the three now-unused old banner image files from the project (`college-pickem-newspaper-banner.png`, `cfb-pickem-banner.png`, `sec-pickem-banner-v2.png`) since nothing referenced them anymore.
- Includes all V7.0.21 functionality (kickoff-time backfill from the ESPN feed).

No Firestore rules changes are required.
