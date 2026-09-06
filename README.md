# College Pick'em V7.0.44

Relink historical entries to real accounts.

The actual problem, not just Colin's case:
- The Week 1 historical import links an entry to a real account only if that account already existed at import time. If someone signs up afterward (like Colin), their historical picks stay under a synthetic "hist-xxxx" entry id.
- The Season Leaderboard and Weekly Tracking already work around this at display time by matching email addresses — so their season totals and name are probably showing up fine.
- But their OWN account's lookups — My Picks, and the new Week Record / Week Rank on the Welcome card — query their entry by their real Firebase UID directly. That doc never gets created, so those stay blank/zero for them even though everyone else sees their stats correctly on the leaderboard.

What's new:
- Admin tab → new "Unlinked Historical Entries" panel. Click "Check For Entries" to scan every week for historical entries whose email now matches a real signed-up account. Each one shows a "Relink to {name}" button.
- Relinking copies the entry's data to a new doc keyed by their real UID, deletes the old synthetic entry (so nothing double-counts), and carries their season-pool opt-in forward if it was set on the historical row. Fixes their own My Picks / Week Record / Week Rank immediately.
- This is admin-only and works even though Week 1 is locked, since admin actions already bypass the pick-lock restriction in the Firestore rules — no rules changes needed for this.
- Includes all V7.0.43 functionality (explicit sticky header fix for Weekly Tracking on mobile).
