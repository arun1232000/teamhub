require('dotenv').config();
const path = require('path');
const express = require('express');
const monday = require('./monday');
const leaveStore = require('./leaveStore');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Restrict to the local network: bind to 0.0.0.0 (default) but never assume
// a public hostname/TLS — this app is meant to run behind office LAN access
// only, per the requirements doc. No public DNS/reverse proxy is configured
// here on purpose.

app.get('/api/meta', async (_req, res) => {
  res.json({ usingMonday: monday.usingMonday });
});

app.get('/api/departments', async (_req, res, next) => {
  try {
    res.json(await monday.getDepartments());
  } catch (err) {
    next(err);
  }
});

app.get('/api/onboarding', async (_req, res, next) => {
  try {
    res.json(await monday.getOnboarding());
  } catch (err) {
    next(err);
  }
});

app.get('/api/sops', async (_req, res, next) => {
  try {
    res.json(await monday.getSops());
  } catch (err) {
    next(err);
  }
});

app.get('/api/attendance', async (_req, res, next) => {
  try {
    res.json(await monday.getAttendance());
  } catch (err) {
    next(err);
  }
});

app.get('/api/reports', async (req, res, next) => {
  try {
    const reports = await monday.getReports();
    const { department } = req.query;
    res.json(department ? reports.filter((r) => r.department === department) : reports);
  } catch (err) {
    next(err);
  }
});

app.get('/api/tickets', async (req, res, next) => {
  try {
    const tickets = await monday.getTickets();
    const { department } = req.query;
    res.json(department ? tickets.filter((t) => t.department === department) : tickets);
  } catch (err) {
    next(err);
  }
});

app.get('/api/tickets/:id', async (req, res, next) => {
  try {
    const tickets = await monday.getTickets();
    const ticket = tickets.find((t) => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

app.get('/api/leave', (_req, res) => {
  res.json(leaveStore.list());
});

app.post('/api/leave', (req, res) => {
  const { name, onLeave, from, to, note } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const record = leaveStore.upsert({ name: name.trim(), onLeave, from, to, note });
  res.json(record);
});

app.delete('/api/leave/:name', (req, res) => {
  leaveStore.remove(req.params.name);
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`TeamHub running at http://localhost:${PORT}`);
  console.log(
    monday.usingMonday
      ? 'monday.com integration: ENABLED (MONDAY_API_TOKEN set)'
      : 'monday.com integration: using local mock data (set MONDAY_API_TOKEN to enable)'
  );
});
