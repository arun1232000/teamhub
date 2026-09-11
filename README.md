# TeamHub

Internal team portal: onboarding checklist, department reporting dashboard
(attendance, tickets, reports), SOPs, and live leave status. Built from
`Internal_Team_Portal_Requirements.docx`.

## Run it

```bash
npm install
npm start
```

Then open `http://localhost:4000` (or `http://<this-machine's-LAN-IP>:4000`
from another machine on the same network — this app is intended for
intranet-only use, not public internet exposure).

## What's here vs. what's mocked

The requirements ask TeamHub to pull attendance, ticket, and report data
from monday.com instead of duplicating data entry. No monday.com API token
or board IDs were available at build time, so `server/monday.js` currently
serves realistic sample data from `server/data/*.json`.

To connect real boards:

1. Copy `.env.example` to `.env` and fill in `MONDAY_API_TOKEN` and the
   board IDs.
2. In `server/monday.js`, fill in the three `TODO` blocks (`getAttendance`,
   `getTickets`, `getReports`) to map each board's columns to the shapes
   already used by the frontend (see the JSON files in `server/data/` for
   the exact shape expected).

Nothing else needs to change — the API routes and frontend consume
whatever `server/monday.js` returns.

Leave status is **not** part of this mock/real split: it's stored natively
in TeamHub (`server/data/leave.json`) since writing it back to monday.com
was an open question in the requirements doc (see below). Swapping
`server/leaveStore.js` for monday.com mutations later is self-contained.

## Access control

There's a lightweight name-entry gate (no password) so onboarding progress
and leave updates are attributable to a person — this is not real
authentication. The requirements doc leaves open whether real login (e.g.
SSO or monday.com identity) is required; wire that in before treating this
as more than an intranet convenience tool.

## Open questions carried over from the requirements doc

These were flagged as unconfirmed in the source doc and are worth settling
with the requester before this goes further than a working prototype:

- **Reports**: exact report types/format/source data.
- **Leave status**: write back to monday.com, or stay native to TeamHub
  (currently: native).
- **Departments**: real department names/structure (currently a sample set:
  Engineering, Support, Sales, Design, Operations).
- **Access control**: anonymous-on-LAN vs. individual login.
- **Mobile access**: desktop-only vs. responsive (currently the layout is
  responsive enough for a tablet, but not tested against a phone-first flow).
- **Data refresh cadence**: currently leave status polls every 8s, dashboard
  data every 60s — both easy to tune in `public/app.js`.
- **SOPs source**: monday.com board vs. a separate shared drive (currently:
  a local mock list of links, per `server/data/sops.json`).

## Project layout

```
server/
  index.js        Express app + REST routes
  monday.js        Data adapter (mock now, monday.com API later)
  leaveStore.js    JSON-file-backed leave status store
  data/*.json      Mock data / seed leave file
public/
  index.html, styles.css, app.js   The single-page frontend
```
