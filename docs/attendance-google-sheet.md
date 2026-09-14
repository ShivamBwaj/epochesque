# Attendance → Google Sheet live backup

Every attendance tick is mirrored to a Google Sheet in real time (pushed after the
database write, so it never slows the checkbox down), plus a **⟳ Re-sync Google Sheet**
button on `/admin/attendance` that rewrites the whole sheet from the database.

Each person owns exactly **one row**, updated in place — the sheet is a live mirror,
not a growing log, so there's never a stale/duplicate row for someone that makes their
status look wrong.

## Setup (2 minutes, one-time — no env vars, no redeploy)

1. Create a Google Sheet (any name, e.g. "Epochesque Attendance").
2. In the sheet: **Extensions → Apps Script**, delete the default code, paste:

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = "Day " + data.day;
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const headers = ["Team", "Team Name", "Name", "Register Number", "Status", "Marked At"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);

  if (data.type === "attendance.resync") {
    sheet.clear();
    sheet.appendRow(headers);
  }

  // Build an index of existing rows keyed by "team_code|reg_no" (falls back to
  // "team_code|name" when reg_no is blank) so every write UPDATES that
  // person's row in place instead of appending a new one. This is what keeps
  // the sheet a true live mirror of the database — no duplicate/stale rows.
  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 6).getValues() : [];
  const rowIndexByKey = {};
  existing.forEach(function (r, i) {
    const key = r[0] + "|" + (r[3] || r[2]);
    rowIndexByKey[key] = i + 2; // sheet row number (1-indexed, header offset)
  });

  data.rows.forEach(function (r) {
    const key = r.team_code + "|" + (r.reg_no || r.name);
    const values = [[r.team_code, r.team_name, r.name, r.reg_no, r.present ? "Present" : "Absent", r.marked_at]];
    const existingRow = rowIndexByKey[key];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, 6).setValues(values);
    } else {
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, 6).setValues(values);
      rowIndexByKey[key] = newRow;
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. **Deploy → New deployment → type: Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the web app URL (`https://script.google.com/macros/s/…/exec`).
5. On `/admin/attendance`, click **🔗 Connect Google Sheet**, paste that URL, hit
   **Connect**. It tests the connection immediately and does a first full sync —
   no `.env` editing, no redeploy. (An `ATTENDANCE_SHEETS_WEBHOOK_URL` env var
   still works too and takes priority if set, for ops-level overrides.)

## How it behaves

- **Normal ticks:** each write updates just that person's row in the sheet — usually
  within a second or two, always in place (never a new duplicate row).
- **Drift / doubt / recovery:** hit **⟳ Re-sync** — it clears the sheet tab and rewrites
  it exactly from the database (the database is always the source of truth).
- Two tabs appear in the sheet: **Day 1** and **Day 2**.
- If the webhook ever fails, nothing breaks — the database save still succeeds; the
  sheet just falls behind until the next successful push or a manual re-sync.
- **Disconnect sheet** on the admin page removes the saved URL; live sync stops until
  you connect one again.

## Where the URL is stored

The webhook URL is saved server-side in a dedicated `integration_secrets` table that
has **zero grants to anon/authenticated roles** (only the service role, used inside
server actions, can read or write it) — unlike the public `event_settings` table, this
URL is never exposed to the browser or any public API, since anyone holding it could
push arbitrary rows into your sheet.

## Why not Google Sheets as the primary store?

Sheets has no transaction/locking guarantees, one-write-per-request quirks, and
rate limits. The database (Supabase Postgres) handles 80 teams × 4 members with
zero effort and is race-safe; the sheet is the live human-readable mirror + backup.
