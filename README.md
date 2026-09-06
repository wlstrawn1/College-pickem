# College Pick'em V7.0.42

Frozen Rank + Player on mobile Weekly Tracking.

Changes:
- On phones, the Weekly Tracking matrix previously un-froze every column (Rank, Player, Score, Max) while swiping through the game columns, so once you scrolled right you lost track of whose row you were looking at.
- Rank and Player are now frozen on the left again on mobile, so they stay visible the whole time you swipe through picks. Score and Max stay non-sticky (and the header row stays non-sticky), so the game columns still get as much width as possible on a narrow screen — this isn't a full revert to the old desktop-style fully-frozen table, just enough to keep the two columns you actually need for orientation.
- Includes all V7.0.41 functionality (Week Rank sub-text sizing fix).

No Firestore rules changes are required.
