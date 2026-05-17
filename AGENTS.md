# AGENTS.md

This file gives Codex and other coding agents the rules for working in this repository.

## Project Identity

This repository is a Chrome MV3 extension.

The project is responsible for:

- reading the live Chrome bookmark tree through `chrome.bookmarks.getTree()`;
- reading a private local `assignments.js` file;
- generating an unclassified assignment template in the extension UI;
- moving bookmarks through the official `chrome.bookmarks` API.

The project is not responsible for:

- replacing Chrome Sync;
- directly rewriting Chrome's local `Bookmarks` file as the final write strategy;
- committing private bookmark data.

## Non-negotiable Rules

- Do not commit a real `assignments.js`.
- Do not commit bookmark exports, bookmark backups, cookies, Chrome profile data, secrets, or keys.
- Do not write user-specific local backup paths into committed files or documentation.
- Do not push to remote unless explicitly asked.
- Keep the repository loadable as an unpacked Chrome extension.
- Preserve the `assignments.js` contract unless asked to change it.

## Source Of Truth

Read these first:

```text
README.md
docs/operation-workflow.md
docs/data-model.md
docs/generating-assignments.md
docs/agent-instructions.md
```

## Private Data Policy

`assignments.js` is private. It may contain bookmark IDs, folder names, and classification structure from a user's Chrome profile.

Only synthetic examples should be committed.

## Agent Workflow

When generating assignments for a user:

1. Confirm the target folder names.
2. Read the Chrome `Bookmarks` JSON as read-only input when available, or ask the user to generate a template through the extension UI.
3. Generate or edit `assignments.js`.
4. Classify primarily by bookmark title, then original path, then URL/domain.
5. Preserve every URL bookmark under each target folder.
6. Do not include folder IDs in `byId`.
7. Tell the user to reload the unpacked extension and run `Dry Run`.
8. Let the human click `Run Organizer` in Chrome.

## Validation

There is no automated project check command by design.

Before finishing, inspect changed files and make sure:

- `manifest.json` is valid JSON;
- `runner.html` still loads `assignments.js` before `runner.js`;
- `assignments.js` remains ignored;
- no user-specific backup paths are present in committed files;
- docs do not describe removed local tooling as required;
- no private bookmark data is staged.

## Commit Policy

Use Conventional Commits:

```text
docs(workflow): clarify chrome-only operation
feat(extension): generate assignments template in chrome
```
