// Builds docs/ — a static, read-mostly copy of TeamHub for GitHub Pages.
//
// GitHub Pages only serves static files, so the /api/* routes that
// server/index.js normally handles are pre-rendered here as static JSON
// files at the same paths (e.g. docs/api/departments), and docs/app.js is
// app.js with saveLeave() patched to persist to localStorage instead of
// POSTing, since there's no server to receive that write.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'server', 'data');
const OUT_DIR = path.join(ROOT, 'docs');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
copyDir(PUBLIC_DIR, OUT_DIR);
fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

const API_DIR = path.join(OUT_DIR, 'api');
fs.mkdirSync(API_DIR, { recursive: true });

const STATIC_ENDPOINTS = {
  meta: () => ({ usingMonday: false }),
  departments: () => readData('departments.json'),
  onboarding: () => readData('onboarding.json'),
  sops: () => readData('sops.json'),
  attendance: () => readData('attendance.json'),
  tickets: () => readData('tickets.json'),
  reports: () => readData('reports.json'),
  leave: () => readData('leave.json'),
};

function readData(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

for (const [route, getData] of Object.entries(STATIC_ENDPOINTS)) {
  fs.writeFileSync(path.join(API_DIR, route), JSON.stringify(getData(), null, 2));
}

const appJsPath = path.join(OUT_DIR, 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const originalSaveLeave = `    try {
      $('#leave-save').disabled = true;
      const record = await api('/api/leave', {
        method: 'POST',
        body: JSON.stringify({ name: state.name, onLeave, from, to, note }),
      });
      upsertLocalLeave(record);
      renderLeaveBoards();
      updateToggleLabel();
      renderHero();
      toast(onLeave ? 'Leave status saved' : "Marked you as available");
    } catch {
      toast("Couldn't save your status — is the server running?", 'error');
    } finally {
      $('#leave-save').disabled = false;
    }`;

const demoSaveLeave = `    // Demo build (docs/): there is no server to persist to, so leave status
    // is kept in-memory/localStorage for this browser only.
    try {
      $('#leave-save').disabled = true;
      const record = { name, onLeave: Boolean(onLeave), from: from || null, to: to || null, note, updatedAt: new Date().toISOString() };
      upsertLocalLeave(record);
      renderLeaveBoards();
      updateToggleLabel();
      renderHero();
      toast(onLeave ? 'Leave status saved (demo — this device only)' : 'Marked you as available (demo — this device only)');
    } finally {
      $('#leave-save').disabled = false;
    }`;

if (!appJs.includes(originalSaveLeave)) {
  throw new Error('build-demo: saveLeave() shape changed in public/app.js — update the patch in scripts/build-demo.js');
}
appJs = appJs.replace(originalSaveLeave, demoSaveLeave);

// GitHub Pages project sites are served from a subpath (e.g.
// /<repo>/), so absolute paths like '/api/leave' resolve to the site
// root instead of the subpath the page actually lives under. Rewrite
// to relative paths, which resolve against the current directory
// regardless of subpath depth.
const beforeApiRewrite = appJs;
appJs = appJs.replace(/'\/api\//g, "'api/");
if (appJs === beforeApiRewrite) {
  throw new Error("build-demo: no '/api/' references found to rewrite — check the patch still applies");
}

fs.writeFileSync(appJsPath, appJs);

console.log(`Built demo site in ${path.relative(ROOT, OUT_DIR)}/`);
