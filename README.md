# College Pick'em V7.0.40

Fixed: Week Rank ignored ties.

Changes:
- Bug fix: the "Week Rank" stat on the Welcome card was showing raw array position (idx+1) instead of the tie-aware rank that rankWeeklyEntries() already computes elsewhere (same standard skip-tie convention the Weekly Tracking table and Season Leaderboard use, e.g. 18, 19, 19, 19, 22). If several players were tied above you, your displayed rank counted each of them individually instead of reflecting the actual tie. Now uses the same _rank value as everywhere else in the app, so a player tied for 19th shows #19, not their position further down the list.
- Includes all V7.0.39 functionality (parallelized week/picks loading, loading-state feedback).

No Firestore rules changes are required.
