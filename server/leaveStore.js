// Simple JSON-file-backed store for leave status.
//
// Open question from the requirements doc (unresolved): should leave status
// write back into monday.com, or live only in TeamHub? This defaults to
// "native to TeamHub" (a local JSON file) since it needs no monday.com
// write-access token to work. Swapping the two functions below for
// monday.com mutations later is a self-contained change.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data', 'leave.json');

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeAll(records) {
  fs.writeFileSync(FILE, JSON.stringify(records, null, 2));
}

function list() {
  return readAll();
}

function upsert({ name, onLeave, from, to, note }) {
  const records = readAll();
  const idx = records.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
  const record = {
    name,
    onLeave: Boolean(onLeave),
    from: from || null,
    to: to || null,
    note: note || '',
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  writeAll(records);
  return record;
}

function remove(name) {
  const records = readAll().filter((r) => r.name.toLowerCase() !== name.toLowerCase());
  writeAll(records);
}

module.exports = { list, upsert, remove };
