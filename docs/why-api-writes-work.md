# Why Chrome Bookmark API Writes Work Better Than File Replacement

Chrome stores bookmarks in a local JSON file, but that file is not the complete source of truth when Chrome Sync is enabled.

When Chrome is running, bookmarks live in Chrome's bookmark model. Sync also tracks server-side state, ordering, deletes, moves, and metadata. Replacing the JSON file outside Chrome can leave those layers out of agreement.

Using `chrome.bookmarks` is different:

- `chrome.bookmarks.create` creates normal local bookmark mutations.
- `chrome.bookmarks.move` changes parent folders and order through Chrome's model.
- `chrome.bookmarks.removeTree` records deletes through the same path as user actions.
- Sync sees those mutations and uploads them to the account.

That is why a one-time unpacked extension can succeed where direct file replacement is later reverted by Sync.
