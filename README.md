# College Pick'em V7.0.53

Home team listed second in every matchup.

What was needed: matchups everywhere displayed as "underdog vs favorite" (a betting designation), with no relationship to who's actually hosting. ESPN's data already includes home/away for each team, it just wasn't being kept.

What's new:
- Games saved through the ESPN slate builder from now on store home/away directly.
- Already-imported weeks (like Week 2) get this backfilled automatically the same way kickoff times were backfilled earlier — the live score feed matches each game to its ESPN event, which includes home/away, and fills it in the first time that match succeeds. No manual re-import needed.
- Every place a matchup is shown as "X vs Y" — Picks, My Picks, Weekly Tracking, Results, and the admin tools (manual result overrides, Edit Picks) — now lists away first, home second, once that data is available for a game. Spread labels, pick percentages, and the "covers" dropdown in admin tools are unaffected — those correctly stay tied to favorite/underdog regardless of home/away, since that's a different concept.
- Games without home/away data yet (Week 1's hand-built slate, or a game the score feed hasn't matched to an ESPN event yet) fall back to the previous underdog/favorite order — harmless, since this is purely a display change and never affects grading.
- Includes all V7.0.52 functionality (games in kickoff order).

No Firestore rules changes are required.
