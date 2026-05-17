# Generating assignments.js

`assignments.js` is the bridge between bookmark analysis and Chrome API writes.

It does not contain full bookmark data. It contains instructions saying where each existing Chrome bookmark ID should be moved.

## Option 1: Generate A Template In Chrome

This path requires only Chrome:

1. Load this repository as an unpacked extension.
2. Enter target folder names, one per line.
3. Click `Generate Template`.
4. Copy or download the generated `assignments.js`.
5. Replace `99 Unclassified / Needs Review` with real categories.
6. Reload the extension.
7. Run `Dry Run`.

This works on macOS, Linux, and Windows because Chrome provides the live bookmark tree.

## Option 2: Let Codex Write assignments.js

Codex may read a local Chrome `Bookmarks` JSON file as read-only input, classify bookmarks, and write `assignments.js` directly.

The final write should still happen through the Chrome extension, not by modifying the `Bookmarks` file.

## Output Shape

```js
globalThis.CODEX_BOOKMARK_TARGET_NAMES = [
  "Folder A"
];

globalThis.CODEX_BOOKMARK_ASSIGNMENTS = {
  "Folder A": {
    categoryOrder: [
      "01 Group A",
      "02 Group B",
      "99 Unclassified"
    ],
    subcategoryOrder: {
      "01 Group A": ["Bucket A", "Bucket B"],
      "02 Group B": ["Bucket C", "Bucket D"],
      "99 Unclassified": ["Needs Review"]
    },
    byId: {
      "123": ["01 Group A", "Bucket A", 0],
      "124": ["02 Group B", "Bucket C", 0],
      "125": ["99 Unclassified", "Needs Review", 0]
    }
  }
};
```

## Generation Algorithm

1. Find each target folder.
2. Recursively walk each target folder.
3. Collect only URL bookmarks, not folder nodes.
4. For each URL bookmark, keep:
   - `id`
   - title
   - URL
   - original folder path
   - original order
5. Classify each bookmark into a category and subcategory.
6. Assign a numeric order within each subcategory.
7. Emit `CODEX_BOOKMARK_TARGET_NAMES`.
8. Emit `CODEX_BOOKMARK_ASSIGNMENTS`.
9. Run the extension's `Dry Run` before writing.

## Classification Guidance

Use the user's instructions first. If the user gives no special rules, use this priority:

1. Bookmark title
2. Existing folder path
3. URL and domain

For uncertain items, use:

```text
99 Unclassified / Needs Review
```

Keep categories broad enough to reduce noise, but specific enough that a human can scan the final folder tree.

## Validation Checklist

Before running the organizer:

- Every target folder exists in the live Chrome bookmark tree.
- Every URL bookmark under every target folder appears once in `byId`.
- No folder IDs are present in `byId`.
- No duplicate bookmark IDs exist across target folders.
- Every used category appears in `categoryOrder`.
- Every used subcategory appears in `subcategoryOrder[category]`.
- `Dry Run` reports an exact match inside Chrome.

## Common Mistakes

- Using URL as the key instead of Chrome bookmark ID.
- Including folder IDs in `byId`.
- Reusing IDs from a different Chrome profile.
- Running after Chrome Sync changed the tree but before regenerating assignments.
- Editing `assignments.js` without reloading the unpacked extension.
- Committing private `assignments.js` to a public repository.
