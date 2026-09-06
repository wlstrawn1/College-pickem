# College Pick'em V7.0.11 — Week 1 Game Order

This patch puts Week 1 in the exact original card/submission order requested by the commissioner:

1. Colorado @ Georgia Tech
2. #7 Miami @ Stanford
3. Fresno State @ #14 USC
4. North Texas @ #6 Indiana
5. East Carolina @ #13 Alabama
6. Oregon State @ #23 Houston
7. Baylor vs. Auburn
8. Boise State @ #2 Oregon
9. Marshall @ #18 Penn State
10. Boston College @ Cincinnati
11. North Alabama @ Arkansas
12. UL Monroe @ Mississippi State
13. Clemson @ #11 LSU
14. Western Michigan @ #16 Michigan
15. Florida Atlantic @ Florida
16. UCLA @ California
17. Washington State @ #17 Washington
18. Wisconsin vs. #4 Notre Dame
19. #24 Louisville vs. #9 Ole Miss
20. #19 SMU @ Florida State

Important compatibility detail: matchup IDs remain attached to the same games as previous builds, so existing Firestore picks/results are not remapped to the wrong matchup. Week 1 is also normalized into this order at render time even if Firestore still contains the older array order.

All V7.0.10 historical-import fixes and prior functionality remain intact.
