# Attendance → Google Sheet live backup

Every attendance tick is mirrored to a Google Sheet in real time (pushed after the
database write, so it never slows the checkbox down), plus a **Re-sync Google Sheet**
button on `/admin/attendance` that rewrites the whole sheet from the database.

## Setup (2 minutes, one-time)

1. Create a Google Sheet (any name, e.g. "Epochesque Attendance").
2. In the sheet: **Extensions → Apps Script**, delete the default code, paste:

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = "Day " + data.day;
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (data.type === "attendance.resync") {
    sheet.clear();
    sheet.appendRow(["Team", "Team Name", "Name", "Register Number", "Status", "Marked At"]);
  }
  const rows = data.rows.map(function (r) {
    return [r.team_code, r.team_name, r.name, r.reg_no, r.present ? "Present" : "Absent", r.marked_at];
  });
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. **Deploy → New deployment → type: Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the web app URL (`https://script.google.com/macros/s/…/exec`).
5. Put it in `.env.local` (and Vercel env vars) as:

```
ATTENDANCE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/…/exec
```

6. Redeploy. The attendance page now shows a green **⟳ Re-sync Google Sheet** button.
   If the badge says "SHEET BACKUP OFF", the env var isn't set.

## How it behaves

- **Normal ticks:** each write pushes just the changed row(s) — the sheet updates within
  a second or two.
- **Drift / doubt / recovery:** hit **Re-sync** — it clears the sheet tab and rewrites it
  exactly from the database (the database is always the source of truth).
- Two tabs appear in the sheet: **Day 1** and **Day 2**.
- If the webhook ever fails, nothing breaks — the database save still succeeds.

## Why not Google Sheets as the primary store?

Sheets has no transaction/locking guarantees, one-write-per-request quirks, and
rate limits. The database (Supabase Postgres) handles 80 teams × 4 members with
zero effort and is race-safe; the sheet is the live human-readable mirror + backup.
