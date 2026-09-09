# College Pick'em V7.0.52

Games now display in kickoff order.

The cause: gamesForWeek() returned games in whatever order they were selected during the admin's "Load ESPN Slate" builder — not chronological. Week 1 had its own special-cased fixed order (matching the original hand-built slate), but no such ordering existed for any other week, including Week 2.

The fix: for every week except Week 1 (which keeps its existing curated order), games now sort by actual kickoff time (ascending) using the date already stored on each game from the ESPN import. This flows through everywhere games are listed — Picks, My Picks, Weekly Tracking columns, and Results — automatically, since they all pull from the same gamesForWeek() function.

Includes all V7.0.51 functionality (Edit Picks admin tool).

No Firestore rules changes are required.
