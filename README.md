# College Pick'em V7.0.12 — Historical No-Pick Support

Changes from V7.0.11:
- Historical Week 1 imports may contain intentional blank picks.
- Blank historical picks are stored as no-picks, score zero, do not count as ATS losses, and do not increase Max Possible.
- Import preview shows the number of no-pick games for that entry.
- Import records retain the affected game IDs for audit/history.
- Karter Smith's adjusted Week 1 CSV can therefore be imported with his first three completed games blank.
- Keeps the exact Week 1 game order and all V7.0.11 functionality.

No Firestore rules change is required from the current rules.
