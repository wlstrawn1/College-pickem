# College Pick'em V4 — Admin Lock Time

New in this build:
- Name example changed to Nick Saban.
- Forgot password flow added using Firebase password reset email.
- My Picks now has Edit My Picks before the deadline.
- After the deadline, editing is disabled and the UI shows Picks Locked.
- Admin screen now has Pick Lock Date + Pick Lock Time.
- Lock time is explicitly stored/displayed in America/Chicago (Central Time).
- Publishing the week saves the deadline to Firestore.
- Picks, confirmation, and My Picks all read the same Firebase deadline.
- Submit Picks becomes Update Picks after the first submission.

Important: your account must have `role: admin` in Firestore for the Admin tab to appear and for Publish Week to work.

Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the GitHub repo root, replacing the prior files.
`firestore.rules` is included for reference and is unchanged from the previously published rules.
