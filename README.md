# College Pick'em V7.0.49

Tiebreak column now shows which team is which.

Changes:
- Fixed: the Tiebreak column showed raw numbers like "21-14" with no indication of which number belonged to which team, so it was meaningless without cross-referencing the Game of the Week separately.
- Added the matchup as a small gold label under the "Tiebreak" header itself (e.g. "Georgia Tech-Colorado"), establishing the score order once instead of repeating team names in all 28 rows. Each row's numbers now read left-to-right in that same order.
- Hovering the header also shows the full explanation (which team's score comes first, and that margin error appears once that game is final).
- Includes all V7.0.48 functionality (tiebreak shown for every player).

No Firestore rules changes are required.
