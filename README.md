# College Pick'em V5 — Matchup Display + Password Reset Message

New in this build:
- Picks page now shows the full matchup instead of only the favorite.
- Each matchup header shows both teams plus the favorite and spread.
- Pick buttons still show the exact side the player is selecting.
- Forgot Password success message now says to check inbox and junk/spam.
- Keeps all V4 features:
  - Nick Saban name example
  - Firebase password reset
  - Edit My Picks before lock
  - Picks Locked after the deadline
  - Admin-controlled lock date and time
  - Central Time / America/Chicago handling
  - Confirmation screen after submission

Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the GitHub repo root, replacing the existing files.
`firestore.rules` is included for reference and is unchanged.


## V5.1 cache fix
This build adds cache-busting query strings to `styles.css` and `app.js` and a small visible `v5.1` marker in the header.
If the live site shows `v5.1`, you know GitHub Pages is serving the new build.
