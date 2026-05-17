"use strict";

const runnerUrl = chrome.runtime.getURL("runner.html");

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({ url: runnerUrl });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: runnerUrl });
});
