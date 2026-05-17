# Runbook

## Generate A Starter assignments.js

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder.
5. Open the advanced template section.
6. Enter target folder names, one per line.
7. Click `Generate Unclassified Template`.
8. Copy or download the generated `assignments.js` template.
9. Replace `99 Unclassified / Needs Review` with real categories.

## Run The Organizer

1. Make sure `assignments.js` exists in this repository folder.
2. Reload the unpacked extension.
3. Click `Dry Run`.
4. Click `Run Organizer` only after Dry Run passes.
5. Save the required JSON backup when Chrome opens the save dialog.
6. Keep Chrome open for Sync.
7. Check another synced device before deleting the backup.

## If Dry Run Fails

1. Stop.
2. Confirm the correct Chrome profile.
3. Let Chrome Sync finish.
4. Regenerate or edit `assignments.js`.
5. Reload the unpacked extension.
6. Run Dry Run again.
