# Scores → Google Sheet live mirror

Every time scores are saved, imported, or a round is published/unpublished,
the current scoreboard for that round is pushed to a Google Sheet in the
background (after the save, so it never slows down judging). There's also a
**⟳ Re-sync Google Sheet** button on `/admin/scoring` that rewrites the whole
sheet from the database.

Each team owns exactly **one row per round**, updated in place — never a
growing log, so there's no stale/duplicate row for a team.

## Setup (2 minutes, one-time — no env vars, no redeploy)

1. Create a Google Sheet (any name, e.g. "Epochesque Scores").
2. In the sheet: **Extensions → Apps Script**, delete the default code, paste:

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const headers = ["Team Code", "Team Name", "Round", "Score", "Notes", "Published", "Updated At"];

  // Group rows by round so a resync clears each round's tab exactly once,
  // then writes every row for that round.
  const byRound = {};
  data.rows.forEach(function (r) {
    (byRound[r.round] = byRound[r.round] || []).push(r);
  });

  Object.keys(byRound).forEach(function (round) {
    const name = "Round - " + round;
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    if (data.type === "scores.resync") {
      sheet.clear();
      sheet.appendRow(headers);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const lastRow = sheet.getLastRow();
    const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 7).getValues() : [];
    const rowIndexByTeam = {};
    existing.forEach(function (row, i) { rowIndexByTeam[row[0]] = i + 2; });

    // Batch new rows into one write instead of one call per team — on a
    // resync the tab was just cleared, so every row is "new" and this
    // turns N slow calls into 1 fast one as the team count grows.
    const appendRows = [];
    byRound[round].forEach(function (r) {
      const values = [r.team_code, r.team_name, r.round, r.total_score, r.notes, r.published ? "Published" : "Draft", r.updated_at];
      const existingRow = rowIndexByTeam[r.team_code];
      if (existingRow) {
        sheet.getRange(existingRow, 1, 1, 7).setValues([values]);
      } else {
        appendRows.push(values);
      }
    });
    if (appendRows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, appendRows.length, 7).setValues(appendRows);
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

**If you already deployed an earlier version:** open the sheet → **Extensions → Apps Script**, replace the whole `doPost` function with the code above, save, then **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**. The existing webhook URL keeps working.
5. On `/admin/scoring`, click **🔗 Connect Google Sheet for scores**, paste
   that URL, hit **Connect**. It tests the connection immediately and does a
   first full sync for every round — no `.env` editing, no redeploy. (A
   `SCORES_SHEETS_WEBHOOK_URL` env var still works too and takes priority if
   set, for ops-level overrides.)

## How it behaves

- Each round gets its own tab (**Round - round1**, **Round - final**, etc.).
- Saving, importing, or publishing/unpublishing scores pushes the *whole*
  scoreboard for that round (not just the changed rows) — cheap at this
  scale (a few dozen to ~100 teams) and guarantees the sheet never drifts
  from a partial push.
- **Drift / doubt / recovery:** hit **⟳ Re-sync** — it clears that round's tab
  and rewrites it exactly from the database (the database is always the
  source of truth, same as attendance).
- If the webhook ever fails, nothing breaks — the database save still
  succeeds; the sheet just falls behind until the next successful push or a
  manual re-sync.
- **Disconnect sheet** removes the saved URL; live sync stops until you
  connect one again.

## Where the URL is stored

Same as the attendance webhook: saved server-side in `integration_secrets`
(zero grants to anon/authenticated — only server actions using the service
role can read or write it), never exposed to the browser or any public API.
