# College Pick'em V7.0.14 — Latest Published Week Default

This build includes all V7.0.13 future-week draft tools plus automatic player landing behavior.

## Player week behavior
- Commissioners can create Week 2, Week 3, etc. as unpublished drafts.
- Draft weeks remain visible only to admins.
- Players continue to see only published weeks.
- On a player's next page load/sign-in, the site automatically opens the highest-numbered published real week.
- Test weeks never become the default player week.
- Players can still use the selector to review older published weeks without being forced back to the newest week during that session.

Example: once Week 2 is published, players land on Week 2 after refresh/sign-in, while Week 1 remains available in the selector.

## Upload/replace
- index.html
- styles-v7.0.14.css
- app-v7.0.14.js
- college-pickem-newspaper-banner.png
- cfb-pickem-banner.png
- sec-pickem-banner-v2.png
- README.md

Firestore rules are unchanged from the current rules already published.
