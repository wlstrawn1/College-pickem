# College Pick'em V7.0.48

Show everyone's tiebreaker prediction.

Changes:
- The Tiebreak column in Weekly Tracking now shows every player's Game of the Week prediction (e.g. "27-34"), not just the players whose tiebreak decided a top-3 finish.
- Margin error only appears (as a small second line under the prediction) once that tiebreaker game is actually final — can't compute an error against a score that hasn't happened yet. Before final, you just see everyone's raw guess.
- Tightened the column font size further (11px prediction, 9px margin-error line) and narrowed the column width slightly, since it's now populated for every row instead of just a few.
- Includes all V7.0.47 functionality (corrected margin-of-victory tiebreak math).

No Firestore rules changes are required.
