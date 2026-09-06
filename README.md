# College Pick'em V7.0.0 — Season Experience

## New in V7.0.0
- Automatic weekly tiebreaker resolution once every game is final.
- Weekly champion banner on Tracking, including tiebreak information when the top score is tied.
- Season leaderboard now shows rank movement, ATS record, win percentage, weekly wins, and best week.
- Player names on the leaderboard open a season player card with weekly finishes and performance history.
- Added Season History with completed-week champion cards and final weekly standings.
- Historical week detail includes the final Game of the Week score and each player's tiebreak error.
- Exact tiebreak ties remain co-champions instead of being broken arbitrarily.

## Tiebreak logic
When players tie on weekly points, the site compares their Game of the Week predicted scores to the final score. It first uses the sum of the absolute error for both team scores. If still tied, it compares total-score error. If that is also tied, the players remain tied.

## Retained
- Safer ESPN Weekly Card Builder with Recommended 20, search, review step, required spreads, and frozen published lines.
- Full uncropped SEC Pick'em banner.
- Automatic ESPN live scores and ATS grading.
- Tracking with live status, pick popularity, and sticky Rank / Player / Score / Max columns.
- Commissioner entry check and missing-picks list.
- Persistent commissioner login.
- Week 1 built-in slate, results, and manual overrides.

## Upload / replace
Upload all files in this package over V6.9.0. Firestore rules are unchanged.
