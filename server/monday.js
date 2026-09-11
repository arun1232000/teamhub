// Data adapter for department reporting (attendance / tickets / reports).
//
// TeamHub is designed to pull this data from monday.com boards so nothing
// has to be re-entered by hand. Real credentials/board IDs were not
// available at build time (see README "Open questions"), so this adapter
// falls back to local mock data that mirrors the shape monday.com would
// return. Once MONDAY_API_TOKEN and the board IDs are known, fill in
// fetchFromMonday() below and flip USE_MONDAY on — the rest of the app
// (routes, frontend) does not need to change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USE_MONDAY = Boolean(process.env.MONDAY_API_TOKEN);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

// Minimal monday.com GraphQL client, used only once real board IDs/column
// mappings are supplied via env vars. Left here so wiring in real data is a
// matter of configuration, not a rewrite.
async function mondayQuery(query, variables) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.MONDAY_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`monday.com API error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`monday.com API error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function getDepartments() {
  return readJson('departments.json');
}

async function getAttendance() {
  if (USE_MONDAY && process.env.MONDAY_ATTENDANCE_BOARD_ID) {
    // TODO: map process.env.MONDAY_ATTENDANCE_BOARD_ID columns to the
    // { month, byDepartment: { <deptId>: { present, absent, leave, headcount } } }
    // shape below, using mondayQuery(...).
  }
  return readJson('attendance.json');
}

async function getTickets() {
  if (USE_MONDAY && process.env.MONDAY_TICKETS_BOARD_ID) {
    // TODO: map process.env.MONDAY_TICKETS_BOARD_ID items/columns to the
    // ticket shape below, using mondayQuery(...).
  }
  return readJson('tickets.json');
}

async function getReports() {
  if (USE_MONDAY && process.env.MONDAY_REPORTS_BOARD_ID) {
    // TODO: map process.env.MONDAY_REPORTS_BOARD_ID items/columns to the
    // report shape below, using mondayQuery(...).
  }
  return readJson('reports.json');
}

async function getSops() {
  // SOPs may live on a monday.com board or in a separate document store —
  // unconfirmed (see README). Defaults to local mock list either way.
  return readJson('sops.json');
}

async function getOnboarding() {
  return readJson('onboarding.json');
}

module.exports = {
  usingMonday: USE_MONDAY,
  getDepartments,
  getAttendance,
  getTickets,
  getReports,
  getSops,
  getOnboarding,
};
