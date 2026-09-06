# College Pick'em V6.5.0 — Commissioner Login + Week 1 Slate

Changes in this build:
- Adds a dedicated Commissioner/Admin login card.
- Admin sign-in verifies the existing Firestore `users/{uid}.role == "admin"` permission.
- Firebase Auth is explicitly set to browser-local persistence, so the commissioner remains signed in until choosing Sign out (unless browser storage is cleared).
- Admin accounts open directly to the Commissioner tab.
- Adds a one-click **Load Week 1 Games** control to write the built-in 20-game Week 1 slate to Firestore.
- Week 1 can be previewed by the commissioner even before the week document has been created.
- Keeps V6.4.0 automatic ESPN score refresh, ATS grading, tracking, leaderboard, and manual-result backup controls.

Week 1 slate included:
1. East Carolina vs #13 Alabama (-28.5) — 2 pts
2. Stanford vs #7 Miami (-24.5) — 2 pts
3. Fresno State vs #14 USC (-22.5) — 2 pts
4. North Texas vs #6 Indiana (-40.5) — 2 pts
5. Oregon State vs #23 Houston (-20.5) — 2 pts
6. Baylor vs Auburn (-6.5) — 1 pt
7. Boise State vs #2 Oregon (-24.5) — 2 pts
8. Marshall vs #18 Penn State (-24.5) — 2 pts
9. Boston College vs Cincinnati (-7.5) — 1 pt
10. North Alabama vs Arkansas (-40.5) — 1 pt
11. UL Monroe vs Mississippi State (-28.5) — 1 pt
12. Clemson vs #11 LSU (-10.5) — 2 pts
13. Western Michigan vs #16 Michigan (-27.5) — 2 pts
14. Florida Atlantic vs Florida (-27.5) — 1 pt
15. California vs UCLA (-1.5) — 1 pt
16. Washington State vs #17 Washington (-23.5) — 2 pts
17. Wisconsin vs #4 Notre Dame (-20.5) — 2 pts
18. #24 Louisville vs #9 Ole Miss (-6.5) — 3 pts
19. Florida State vs #19 SMU (-2.5) — 2 pts
20. Colorado vs Georgia Tech (-6.5) — 1 pt

Upload/replace:
- index.html
- styles.css
- app.js
- cfb-pickem-banner.png
- README.md
- firestore.rules

Firestore rules are unchanged. The commissioner account must already have `role: "admin"` in its user document.
