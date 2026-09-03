# College Pick'em V6 — Multi-Week + Test Mode

V6 adds the multi-week foundation:
- Week selector across the app
- Admin-only Create Test Week
- TEST MODE banner
- Reset Test Week clears test submissions without touching real weeks
- Test entries are marked and excluded from future real standings
- Results tab foundation
- Season leaderboard foundation
- Each week has its own Central Time lock deadline
- My Picks / Picks switch with the selected week
- Cache busting bumped to v6

Still included:
- Nick Saban name example
- Forgot password + junk/spam reminder
- Full matchup + spread display
- Confirmation screen
- Edit My Picks until lock
- Automatic locked UI after deadline

IMPORTANT FIRESTORE RULES UPDATE:
V6 includes stronger rules:
1. Players can only change their own picks before that week's lock time.
2. Other players cannot read someone else's entries until after the lock.
3. Admin can manage weeks and entries.

Publish the included `firestore.rules` in Firebase before relying on lock/privacy behavior.

Upload `index.html`, `styles.css`, `app.js`, and `README.md` to GitHub.
Then publish `firestore.rules` in Firebase Console > Firestore Database > Rules.
