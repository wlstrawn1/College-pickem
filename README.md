# College Pick'em V7.0.39

Faster loading on slow connections.

Changes:
- The two Firestore reads on every login and week switch (the week's own document, and your entries document for that week) used to run one after another. They now run in parallel via Promise.all — on a weak mobile connection where each round trip might take a second or more, this removes a whole extra round trip from the critical path every single time the app loads or you switch weeks.
- Added a visible "Loading your picks…" state and "…" placeholders for This Week's record/rank the moment a week switch starts, instead of leaving stale zeroed numbers on screen during the fetch — on a slow connection, static "0-0" and "—" look identical to "you have no picks," which reads as broken rather than loading.
- Confirmed the live ESPN score fetch (external network call, the slowest part of any weekly data refresh) was already deferred to run after the page renders rather than blocking it — that part of the architecture was already sound; this release targets the two Firestore reads that were still sequential.
- Includes all V7.0.38 functionality (team-name labels on the tiebreaker boxes).

No Firestore rules changes are required.
