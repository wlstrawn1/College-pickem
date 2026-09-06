# College Pick'em V7.0.35

Season pool opt-in is now one-way.

Changes:
- Once a player has joined the $10 season ATS pot, they can no longer opt back out through the Edit Name form — the checkbox shows as checked and disabled, with a note explaining to contact the commissioner if it was a mistake. Players who haven't joined yet can still opt in normally.
- This is enforced in three layers, not just the UI: (1) the checkbox is disabled once joined so it can't be unchecked by clicking, (2) the save handler itself never sends `false` for seasonPool if the existing profile already had it `true`, and (3) the Firestore rule for `users/{uid}` now rejects any non-admin update that would flip seasonPool from true to false/absent, even a hand-crafted request bypassing the UI entirely. Admins can still correct a mistaken opt-in directly if genuinely needed.
- **This version includes a Firestore rules change — you'll need to publish the updated firestore.rules to your Firebase project (Firestore Database → Rules) for the server-side protection to take effect.** The app itself will still work without republishing the rules, but the one-way enforcement would only be client-side until you do.
- Includes all V7.0.34 functionality (self-service name edit).
