# Security

## Sensitive Data

Do not commit:

- real `assignments.js`;
- Chrome `Bookmarks` files from a real profile;
- bookmark backups;
- local backup paths;
- cookies;
- profile data;
- private keys;
- tokens;
- `.env` files.

## Chrome Permissions

The extension currently asks for:

```text
bookmarks
tabs
storage
```

Do not add broader permissions without documenting why.

## Public Examples

Use only synthetic folder names, URLs, and bookmark IDs in committed examples.

## Reporting

If private data is committed accidentally, remove it from history before pushing and rotate any affected secrets.
