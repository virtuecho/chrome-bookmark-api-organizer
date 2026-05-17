"use strict";

// Copy this file to assignments.js and replace the sample IDs with IDs from
// the Chrome profile you are going to run against.
//
// This organizer relies on Chrome bookmark IDs. Those IDs are local to a Chrome
// profile and can change after export/import.
//
// runner.html loads this file before runner.js:
//   <script src="assignments.js"></script>
//   <script src="runner.js"></script>
//
// This file does not contain the bookmarks themselves. It only says where each
// existing bookmark ID should be moved.

globalThis.CODEX_BOOKMARK_TARGET_NAMES = [
  "Folder A",
  "Folder B"
];

globalThis.CODEX_BOOKMARK_ASSIGNMENTS = {
  "Folder A": {
    categoryOrder: [
      "01 Group A",
      "02 Group B"
    ],
    subcategoryOrder: {
      "01 Group A": [
        "Bucket A",
        "Bucket B"
      ],
      "02 Group B": [
        "Bucket C",
        "Bucket D"
      ]
    },
    byId: {
      "123": ["01 Group A", "Bucket A", 0],
      "124": ["02 Group B", "Bucket C", 0]
    }
  },
  "Folder B": {
    categoryOrder: [
      "01 Group C",
      "02 Group D"
    ],
    subcategoryOrder: {
      "01 Group C": [
        "Bucket E",
        "Bucket F"
      ],
      "02 Group D": [
        "Bucket G"
      ]
    },
    byId: {
      "223": ["01 Group C", "Bucket E", 0],
      "224": ["02 Group D", "Bucket G", 0]
    }
  }
};
