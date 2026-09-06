# College Pick'em V7.0.7 — Week 1 Google Forms Import

This build keeps everything from V7.0.6 and updates the historical Week 1 importer to accept the actual Google Forms CSV export used for the league.

## Week 1 import improvements
- Recognizes the Google Forms team abbreviations used in the Week 1 responses (GT, MIA, ALA, barn, PSU, etc.).
- Maps all 20 picks to the correct stored Week 1 games, even though the Google Form column order differs from the website game order.
- Reads the single combined Game of the Week score-prediction field and converts it to Clemson/LSU scores.
- Handles score formats such as `LSU 34-17`, `28-23 LSU`, `Clemson 20 @ 24 LSU`, and plain `24-31`.
- Ignores the transposed summary table appended beneath the real Google Forms responses.
- Preserves the season ATS participation response on the historical entry.
- Preview reports how many non-submission rows were ignored before import.

## Verified source file
The supplied Week 1 CSV contains 28 actual form submissions. The remaining appended rows are summary/report rows and are intentionally ignored by the importer.

## Import steps
1. Upload V7.0.7 to the site.
2. Sign in as Commissioner.
3. Open Admin > Historical Data > Import Week 1 Submissions.
4. Choose the original Google Forms CSV export.
5. Click Preview Week 1 Import.
6. Confirm the preview shows 28 submissions ready.
7. Click Import 28 Week 1 Entries.

Firestore rules are unchanged from V7.0.6 / V7.0.5.
