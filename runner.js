"use strict";

const logEl = document.getElementById("log");
const stateEl = document.getElementById("state");
const targetFoldersEl = document.getElementById("target-folders");
const assignmentOutputEl = document.getElementById("assignment-output");
const backupInputEl = document.getElementById("backup-input");
const backupLinksEl = document.getElementById("backup-links");
const generateTemplateButton = document.getElementById("generate-template");
const copyTemplateButton = document.getElementById("copy-template");
const downloadTemplateButton = document.getElementById("download-template");
const renderBackupsButton = document.getElementById("render-backups");
const clearBackupsButton = document.getElementById("clear-backups");
const dryRunButton = document.getElementById("dry-run");
const runButton = document.getElementById("run");

function log(message) {
  const line = typeof message === "string" ? message : JSON.stringify(message, null, 2);
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function setState(message, className = "") {
  stateEl.textContent = message;
  stateEl.className = className;
  document.title = `${message} - Chrome Bookmark API Organizer`;
}

function chromeCall(method, ...args) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks[method](...args, (result) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(result);
    });
  });
}

const api = {
  getTree: () => chromeCall("getTree"),
  create: (details) => chromeCall("create", details),
  move: (id, details) => chromeCall("move", id, details),
  removeTree: (id) => chromeCall("removeTree", id),
  storageSet: (value) => new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve();
    });
  })
};

function getAssignments() {
  const assignments = globalThis.CODEX_BOOKMARK_ASSIGNMENTS;
  if (!assignments || typeof assignments !== "object") {
    throw new Error("Missing CODEX_BOOKMARK_ASSIGNMENTS. Copy assignments.example.js to assignments.js and edit it first.");
  }
  return assignments;
}

function getTargetNames(assignments) {
  const explicit = globalThis.CODEX_BOOKMARK_TARGET_NAMES;
  const targetNames = Array.isArray(explicit) && explicit.length ? explicit : Object.keys(assignments);
  if (!targetNames.length) throw new Error("No target folders configured.");
  return targetNames;
}

function getTargetNamesFromInput() {
  return targetFoldersEl.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function initializeTargetFolderInput() {
  const assignments = globalThis.CODEX_BOOKMARK_ASSIGNMENTS;
  const explicit = globalThis.CODEX_BOOKMARK_TARGET_NAMES;
  const targetNames = Array.isArray(explicit) && explicit.length
    ? explicit
    : assignments && typeof assignments === "object"
      ? Object.keys(assignments)
      : [];

  if (targetNames.length && !targetFoldersEl.value.trim()) {
    targetFoldersEl.value = targetNames.join("\n");
  }
}

function walk(node, fn, trail = []) {
  if (!node) return;
  fn(node, trail);
  const nextTrail = node.url ? trail : [...trail, node.title || ""];
  for (const child of node.children || []) walk(child, fn, nextTrail);
}

function countUrls(node) {
  let count = 0;
  walk(node, (current) => {
    if (current.url) count += 1;
  });
  return count;
}

function findBookmarkBar(tree) {
  const root = tree[0];
  return (root.children || []).find((node) => (
    node.id === "1" ||
    node.title === "Bookmarks Bar" ||
    node.title === "书签栏"
  ));
}

function findTargetFolder(tree, title) {
  const bookmarkBar = findBookmarkBar(tree);
  if (!bookmarkBar) throw new Error("Cannot find the Bookmarks Bar.");
  return (bookmarkBar.children || []).find((node) => !node.url && node.title === title);
}

function collectUrlItems(folder) {
  const items = [];
  walk(folder, (node, trail) => {
    if (!node.url) return;
    items.push({
      id: node.id,
      title: node.title || "",
      url: node.url || "",
      path: trail.join(" / ")
    });
  });
  return items;
}

function orderedKeys(keys, preferred = []) {
  return [...keys].sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b, "zh-Hans-CN");
  });
}

function bucketItems(items, assignment) {
  const buckets = new Map();
  for (const item of items) {
    const assigned = assignment.byId[item.id];
    const category = assigned ? assigned[0] : "99 Unmatched";
    const subcategory = assigned ? assigned[1] : "Needs Review";
    const order = assigned ? assigned[2] : Number.MAX_SAFE_INTEGER;
    if (!buckets.has(category)) buckets.set(category, new Map());
    const subMap = buckets.get(category);
    if (!subMap.has(subcategory)) subMap.set(subcategory, []);
    subMap.get(subcategory).push({ ...item, order });
  }
  return buckets;
}

function analyzeTarget(tree, targetName, assignment) {
  const target = findTargetFolder(tree, targetName);
  if (!target) throw new Error(`Cannot find target folder: ${targetName}.`);

  const items = collectUrlItems(target);
  const liveIds = new Set(items.map((item) => item.id));
  const assignedIds = Object.keys(assignment.byId || {});
  const missingLiveIds = assignedIds.filter((id) => !liveIds.has(id));
  const extraLiveIds = [...liveIds].filter((id) => !assignment.byId[id]);

  return {
    targetName,
    folderId: target.id,
    bookmarkCount: items.length,
    assignedCount: assignedIds.length,
    missingLiveCount: missingLiveIds.length,
    extraLiveCount: extraLiveIds.length,
    missingLiveIds: missingLiveIds.slice(0, 20),
    extraLiveIds: extraLiveIds.slice(0, 20),
    topChildren: (target.children || []).slice(0, 20).map((child) => ({
      id: child.id,
      title: child.title,
      url: Boolean(child.url)
    }))
  };
}

function buildTemplateAssignments(tree, targetNames) {
  const assignments = {};
  const seenIds = new Set();

  for (const targetName of targetNames) {
    const target = findTargetFolder(tree, targetName);
    if (!target) throw new Error(`Cannot find target folder: ${targetName}.`);

    const items = collectUrlItems(target);
    const byId = {};
    items.forEach((item, index) => {
      if (seenIds.has(item.id)) throw new Error(`Duplicate bookmark ID across target folders: ${item.id}`);
      seenIds.add(item.id);
      byId[item.id] = ["99 Unclassified", "Needs Review", index];
    });

    assignments[targetName] = {
      categoryOrder: ["99 Unclassified"],
      subcategoryOrder: {
        "99 Unclassified": ["Needs Review"]
      },
      byId
    };
  }

  return assignments;
}

function formatAssignmentsTemplate(targetNames, assignments) {
  const lines = [];
  lines.push('"use strict";');
  lines.push("");
  lines.push("// Generated from the live Chrome bookmark tree.");
  lines.push("// Review and replace 99 Unclassified / Needs Review before running on real bookmarks.");
  lines.push("");
  lines.push(`globalThis.CODEX_BOOKMARK_TARGET_NAMES = ${JSON.stringify(targetNames, null, 2)};`);
  lines.push("");
  lines.push(`globalThis.CODEX_BOOKMARK_ASSIGNMENTS = ${JSON.stringify(assignments, null, 2)};`);
  lines.push("");
  return lines.join("\n");
}

async function handleGenerateTemplate() {
  logEl.textContent = "";
  setState("Generating...");
  try {
    const targetNames = getTargetNamesFromInput();
    if (!targetNames.length) throw new Error("Enter at least one target folder.");
    const tree = await api.getTree();
    const assignments = buildTemplateAssignments(tree, targetNames);
    assignmentOutputEl.value = formatAssignmentsTemplate(targetNames, assignments);
    const counts = Object.fromEntries(
      targetNames.map((name) => [name, Object.keys(assignments[name].byId).length])
    );
    log({ ok: true, counts });
    setState("Template Ready", "ok");
  } catch (error) {
    log(error.stack || error.message || String(error));
    setState("Template Failed", "err");
  }
}

async function handleCopyTemplate() {
  if (!assignmentOutputEl.value.trim()) return;
  try {
    await navigator.clipboard.writeText(assignmentOutputEl.value);
    setState("Template Copied", "ok");
  } catch (error) {
    log(error.stack || error.message || String(error));
    setState("Copy Failed", "err");
  }
}

function handleDownloadTemplate() {
  if (!assignmentOutputEl.value.trim()) return;
  const blob = new Blob([assignmentOutputEl.value], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "assignments.js";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setState("Template Downloaded", "ok");
}

function encodePathPart(value) {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function backupTargetToHref(target) {
  const value = target.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;

  if (/^[a-z]:[\\/]/i.test(value)) {
    const normalized = value.replaceAll("\\", "/");
    const drive = normalized.slice(0, 2);
    const rest = normalized.slice(2);
    return `file:///${drive}${encodePathPart(rest)}`;
  }

  if (value.startsWith("\\\\")) {
    const normalized = value.replaceAll("\\", "/");
    const withoutPrefix = normalized.replace(/^\/+/, "");
    return `file://${encodePathPart(withoutPrefix)}`;
  }

  if (value.startsWith("/")) return `file://${encodePathPart(value)}`;
  return value;
}

function parseBackupLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const separator = trimmed.indexOf("|");
  const label = separator === -1 ? `Backup ${index + 1}` : trimmed.slice(0, separator).trim();
  const target = separator === -1 ? trimmed : trimmed.slice(separator + 1).trim();
  if (!target) return null;
  return {
    href: backupTargetToHref(target),
    label: label || `Backup ${index + 1}`
  };
}

function handleRenderBackups() {
  backupLinksEl.textContent = "";
  const links = backupInputEl.value
    .split(/\r?\n/)
    .map(parseBackupLine)
    .filter(Boolean);

  for (const link of links) {
    const item = document.createElement("li");
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    item.append(anchor);
    backupLinksEl.append(item);
  }

  log({ backupLinksRendered: links.length });
  setState(links.length ? "Backup Links Ready" : "No Backup Links", links.length ? "ok" : "");
}

function handleClearBackups() {
  backupInputEl.value = "";
  backupLinksEl.textContent = "";
  setState("Backup Links Cleared");
}

async function removeOldFolders(oldChildren) {
  let removed = 0;
  for (const child of oldChildren) {
    if (child.url) continue;
    try {
      await api.removeTree(child.id);
      removed += 1;
    } catch (error) {
      if (!/Can't find bookmark|No node with id/i.test(error.message)) throw error;
    }
  }
  return removed;
}

async function dryRun() {
  const assignments = getAssignments();
  const targetNames = getTargetNames(assignments);
  const tree = await api.getTree();
  const results = targetNames.map((targetName) => analyzeTarget(tree, targetName, assignments[targetName]));
  const mismatch = results.filter((item) => item.bookmarkCount !== item.assignedCount || item.missingLiveCount || item.extraLiveCount);
  return {
    ok: mismatch.length === 0,
    results,
    mismatch
  };
}

async function organizeTarget(tree, targetName, assignment, progress) {
  const target = findTargetFolder(tree, targetName);
  if (!target) throw new Error(`Cannot find target folder: ${targetName}.`);

  const oldChildren = [...(target.children || [])];
  const items = collectUrlItems(target);
  const buckets = bucketItems(items, assignment);
  const counts = [];
  let createdFolders = 0;
  let moved = 0;

  const categoryKeys = orderedKeys(buckets.keys(), assignment.categoryOrder || []);
  for (const category of categoryKeys) {
    const categoryFolder = await api.create({ parentId: target.id, title: category });
    createdFolders += 1;
    const subMap = buckets.get(category);
    const subKeys = orderedKeys(subMap.keys(), (assignment.subcategoryOrder || {})[category] || []);

    for (const subcategory of subKeys) {
      const subFolder = await api.create({ parentId: categoryFolder.id, title: subcategory });
      createdFolders += 1;
      const bucket = subMap.get(subcategory).sort((a, b) => (
        a.order - b.order ||
        a.title.localeCompare(b.title, "zh-Hans-CN")
      ));

      for (let index = 0; index < bucket.length; index += 1) {
        await api.move(bucket[index].id, { parentId: subFolder.id, index });
        moved += 1;
        progress.totalMoved += 1;
        if (progress.totalMoved % 100 === 0) {
          setState(`Moving bookmarks... ${progress.totalMoved}`);
          log(`Moved ${progress.totalMoved} bookmarks...`);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      counts.push({ category, subcategory, count: bucket.length });
    }
  }

  const removedOldFolders = await removeOldFolders(oldChildren);
  return {
    targetName,
    beforeCount: items.length,
    moved,
    createdFolders,
    removedOldFolders,
    counts
  };
}

function verifyTargets(tree, reports) {
  const result = {};
  for (const report of reports) {
    const folder = findTargetFolder(tree, report.targetName);
    result[report.targetName] = {
      count: countUrls(folder),
      topFolders: (folder.children || []).map((child) => child.title),
      topCount: (folder.children || []).length
    };
  }
  return result;
}

async function handleDryRun() {
  logEl.textContent = "";
  setState("Checking...");
  try {
    const result = await dryRun();
    log(result);
    setState(result.ok ? "Dry Run OK" : "Dry Run Mismatch", result.ok ? "ok" : "err");
  } catch (error) {
    log(error.stack || error.message || String(error));
    setState("Dry Run Failed", "err");
  }
}

async function runOrganizer() {
  if (globalThis.__bookmarkOrganizerRunning) return;
  globalThis.__bookmarkOrganizerRunning = true;
  dryRunButton.disabled = true;
  runButton.disabled = true;
  logEl.textContent = "";
  setState("Running...");

  const startedAt = new Date().toISOString();
  try {
    const assignments = getAssignments();
    const targetNames = getTargetNames(assignments);
    const preflight = await dryRun();
    log({ preflight });
    if (!preflight.ok) {
      throw new Error("Preflight mismatch. Refusing to write because live bookmark IDs do not match assignments.js.");
    }

    const tree = await api.getTree();
    const reports = [];
    const progress = { totalMoved: 0 };
    for (const targetName of targetNames) {
      setState(`Organizing ${targetName}...`);
      reports.push(await organizeTarget(tree, targetName, assignments[targetName], progress));
    }

    setState("Verifying...");
    const finalTree = await api.getTree();
    const verification = verifyTargets(finalTree, reports);
    const finishedAt = new Date().toISOString();
    const finalReport = { ok: true, startedAt, finishedAt, reports, verification };
    await api.storageSet({ bookmarkOrganizerReport: finalReport });
    log(finalReport);
    setState("Done", "ok");
  } catch (error) {
    const finalReport = {
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error && (error.stack || error.message || String(error))
    };
    await api.storageSet({ bookmarkOrganizerReport: finalReport }).catch(() => {});
    log(finalReport.error);
    setState("Failed", "err");
  } finally {
    dryRunButton.disabled = false;
    runButton.disabled = false;
    globalThis.__bookmarkOrganizerRunning = false;
  }
}

generateTemplateButton.addEventListener("click", handleGenerateTemplate);
copyTemplateButton.addEventListener("click", handleCopyTemplate);
downloadTemplateButton.addEventListener("click", handleDownloadTemplate);
renderBackupsButton.addEventListener("click", handleRenderBackups);
clearBackupsButton.addEventListener("click", handleClearBackups);
dryRunButton.addEventListener("click", handleDryRun);
runButton.addEventListener("click", runOrganizer);

initializeTargetFolderInput();

if (new URLSearchParams(location.search).get("autorun") === "1") {
  runOrganizer();
}
