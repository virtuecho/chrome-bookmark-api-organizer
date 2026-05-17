# Quality Gates

The quality gate is manual and Chrome-based:

1. The repository loads as an unpacked Chrome extension.
2. `manifest.json` is valid JSON.
3. `runner.html` loads `assignments.js` before `runner.js`.
4. The extension page can generate an assignment template from live Chrome bookmarks.
5. `Dry Run` refuses to write when live bookmark IDs do not match `assignments.js`.
6. `Run Organizer` is used only after Dry Run reports an exact match.
7. Real `assignments.js` and bookmark exports remain untracked.

Do not add automated tooling just to make the repository look larger. The project is clean when it is understandable, loadable in Chrome, and safe with private data.
