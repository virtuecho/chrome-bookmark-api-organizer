# Data Model

This document explains three related formats:

1. The local Chrome `Bookmarks` file.
2. The bookmark tree returned by the Chrome extension API.
3. The `assignments.js` file accepted by this project.

## Local Chrome Bookmarks File

Chrome stores bookmarks under a user data root. Each profile has its own `Bookmarks` file.

Common locations:

| Platform | Default profile Bookmarks file |
| --- | --- |
| macOS | `~/Library/Application Support/Google/Chrome/Default/Bookmarks` |
| Linux | `~/.config/google-chrome/Default/Bookmarks` |
| Windows | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Bookmarks` |

Additional profiles are usually named `Profile 1`, `Profile 2`, and so on:

```text
<Chrome user data root>/Default/Bookmarks
<Chrome user data root>/Profile 1/Bookmarks
<Chrome user data root>/Profile 2/Bookmarks
```

The extension does not need to know these paths at runtime. Codex may read the file as analysis input, but the final write should still happen through Chrome's bookmark API.

The file is JSON. Its shape is roughly:

```json
{
  "checksum": "...",
  "roots": {
    "bookmark_bar": {
      "type": "folder",
      "id": "1",
      "name": "Bookmarks Bar",
      "children": [
        {
          "type": "folder",
          "id": "10",
          "name": "Folder A",
          "children": [
            {
              "type": "url",
              "id": "123",
                "name": "Example Page",
                "url": "https://example.com/",
              "date_added": "13300000000000000"
            }
          ]
        }
      ]
    },
    "other": {
      "type": "folder",
      "id": "2",
      "name": "Other Bookmarks",
      "children": []
    },
    "synced": {
      "type": "folder",
      "id": "3",
      "name": "Mobile Bookmarks",
      "children": []
    }
  },
  "version": 1
}
```

Common local-file fields:

- `name`: bookmark or folder title.
- `type`: usually `url` or `folder`.
- `url`: present on URL bookmarks.
- `children`: present on folders.
- `id`: Chrome's bookmark node ID, usually stored as a string.

Agents can read this file to analyze and generate assignments, but the extension does not read this file at runtime.

## Chrome bookmarks API Format

At runtime, the extension calls:

```js
chrome.bookmarks.getTree()
```

That API returns `BookmarkTreeNode[]`. The structure is similar to the local JSON file, but field names differ:

```json
[
  {
    "id": "0",
    "title": "",
    "children": [
      {
        "id": "1",
        "title": "Bookmarks Bar",
        "children": [
          {
            "id": "10",
            "title": "Folder A",
            "children": [
              {
                "id": "123",
                "title": "Example Page",
                "url": "https://example.com/"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

Common API fields:

- `title`: bookmark or folder title.
- `url`: present on URL bookmarks.
- `children`: present on folders.
- `id`: bookmark node ID.
- `parentId`, `index`, `dateAdded`: may also appear.

`runner.js` works with this API format, not the local file format.

## assignments.js Format

The extension's real input is `assignments.js`. It is a normal JavaScript file loaded by `runner.html` through a `<script>` tag.

It must define:

```js
globalThis.CODEX_BOOKMARK_ASSIGNMENTS = {
  "Target Folder Name": {
    categoryOrder: ["01 Category"],
    subcategoryOrder: {
      "01 Category": ["Subcategory"]
    },
    byId: {
      "123": ["01 Category", "Subcategory", 0]
    }
  }
};
```

It may also define:

```js
globalThis.CODEX_BOOKMARK_TARGET_NAMES = [
  "Target Folder Name"
];
```

If `CODEX_BOOKMARK_TARGET_NAMES` is missing, the extension uses all top-level keys in `CODEX_BOOKMARK_ASSIGNMENTS` as target folder names.

## TypeScript Shape

```ts
type BookmarkId = string;
type CategoryName = string;
type SubcategoryName = string;
type SortIndex = number;

type BookmarkAssignment = [
  CategoryName,
  SubcategoryName,
  SortIndex
];

interface TargetFolderAssignment {
  categoryOrder: CategoryName[];
  subcategoryOrder: Record<CategoryName, SubcategoryName[]>;
  byId: Record<BookmarkId, BookmarkAssignment>;
}

type BookmarkAssignments = Record<string, TargetFolderAssignment>;
```

## Meaning of byId

`byId` is the core mapping:

```js
"123": ["01 Group A", "Bucket A", 0]
```

This means:

- Find the live URL bookmark whose Chrome bookmark ID is `123`.
- Move it under the new folder path `01 Group A/Bucket A` inside the target folder.
- Place it at index `0` inside `Bucket A`.

`byId` should not contain folder IDs. Use URL bookmark IDs only.

## How the Extension Uses assignments.js

Runtime flow:

1. `runner.html` loads `assignments.js`.
2. `assignments.js` sets `globalThis.CODEX_BOOKMARK_ASSIGNMENTS`.
3. `runner.html` loads `runner.js`.
4. `runner.js` calls `chrome.bookmarks.getTree()` to read the live bookmark tree.
5. `runner.js` finds the target folders under the Bookmarks Bar.
6. `runner.js` collects all URL bookmarks inside each target folder.
7. `Dry Run` checks whether live URL bookmark IDs exactly match `byId`.
8. `Run Organizer` creates category folders, moves bookmarks, and removes old subfolders.

## Accepted And Rejected Inputs

Accepted:

- `assignments.js`
- A mapping keyed by Chrome bookmark ID
- One or more target folders
- Any number of categories and subcategories per target folder

Rejected:

- Raw Chrome `Bookmarks` JSON as direct extension input
- Chrome-exported bookmarks HTML as direct extension input
- URL-only data without Chrome bookmark IDs
- Vague classification suggestions
- Bookmark IDs from another profile or an old export/import cycle

## Why Bookmark IDs Are Required

Names and URLs can repeat. The same page may be bookmarked multiple times, and many bookmark titles are duplicated or empty.

Chrome bookmark IDs point to specific nodes in the current profile, so they are suitable for bulk moves. The tradeoff is that IDs are only reliable for the current profile state. They may change after export/import, sync merges, or reconstruction.

## Common Sources For assignments.js

`assignments.js` can be written manually or generated by an agent.

A typical generator will:

1. Read the current profile's `Bookmarks` file as analysis input only.
2. Find the configured target folders.
3. Recursively collect URL bookmarks under each target folder.
4. Classify primarily by bookmark title, then original path, then URL/domain.
5. Emit `assignments.js`.
6. Ask the extension's `Dry Run` to check that IDs still match live Chrome.

The final write is performed by the extension through the Chrome bookmarks API.
