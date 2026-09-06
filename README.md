# College Pick'em V7.0.47

Corrected tiebreak: margin of victory, not per-team closeness.

The bug:
- entryTiebreakMetrics() was computing error as the sum of how far off each individual team's predicted score was from the actual score (|predicted A − actual A| + |predicted B − actual B|). That rewards guessing both raw scores closely, not guessing the margin/spread correctly — the league's actual house rule.
- Example of the difference: actual final is 20–27 (margin 7). A guess of 30–37 has a perfect margin (37−30=7) but a large per-team error (20 total). A guess of 20–26 has a near-perfect per-team error (1 total) but a worse margin (6, off by 1). The old code would have picked the second guess as the winner; margin-of-victory rules say the first guess should win.

The fix:
- error is now |(predicted teamB − predicted teamA) − (actual teamB − actual teamA)| — the difference between your predicted margin and the actual margin. Lower still wins; totalError (combined-score closeness) remains the secondary tiebreak-of-the-tiebreak, unchanged.
- This one function feeds every tiebreak-dependent display in the app — Weekly Tracking's new Tiebreak column, the Weekly Champion banner, Season History, and the Player Card — so all of them now agree and use the corrected math.
- Relabeled "X error" to "X margin error" everywhere it's displayed, so it's unambiguous what's being measured.
- Includes all V7.0.46 functionality (visible Tiebreak column in Weekly Tracking).

No Firestore rules changes are required. This is a display/ranking-logic fix only — no historical data needs to be touched, since tiebreak is computed live from each entry's stored prediction and the game's actual final score.
