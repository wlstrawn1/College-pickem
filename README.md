# College Pick'em V7.0.43

Fixed: "#" / "Player" header labels didn't freeze like the data did.

Changes:
- The v7.0.42 fix froze the Rank/Player *data* cells correctly, but the "#" and "Player" *header labels* weren't reliably freezing alongside them on phone (mobile Safari can be inconsistent about applying position:sticky to <th> the same way as <td>, especially when the two only shared behavior through a CSS custom property defined in a separate rule).
- Rewrote the mobile sticky rules to be fully explicit for both header and data cells — hardcoded left offsets instead of relying on a variable resolved elsewhere, and explicit rules for the <th> variants specifically — so the header labels and the data beneath them now behave identically while swiping.
- Includes all V7.0.42 functionality.

No Firestore rules changes are required.
