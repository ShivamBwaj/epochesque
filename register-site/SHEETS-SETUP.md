# Connecting the registration form to a Google Sheet

Every submission is saved to the database first (that's the source of truth), then
pushed to your Google Sheet in the background — one row per person, updated in
place if they resubmit with the same registration number (no duplicates).

## 1. Create the sheet + script (2 minutes)

1. Create a new Google Sheet (any name, e.g. "Epochesque Registrations").
2. **Extensions → Apps Script**, delete the default code, paste this:

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  const headers = ["Name", "Reg No", "Phone", "Email", "Registered At"];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);

  const lastRow = sheet.getLastRow();
  const existing = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 5).getValues() : [];
  const rowIndexByRegNo = {};
  existing.forEach(function (r, i) { rowIndexByRegNo[r[1]] = i + 2; });

  data.rows.forEach(function (r) {
    const values = [[r.name, r.reg_no, r.phone, r.email, r.registered_at]];
    const existingRow = rowIndexByRegNo[r.reg_no];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, 5).setValues(values);
    } else {
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, 5).setValues(values);
      rowIndexByRegNo[r.reg_no] = newRow;
    }
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. **Deploy → New deployment → type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the web app URL (ends in `/exec`).

## 2. Connect it to the site

1. Go to your Netlify dashboard → the **register site** (not the main Epochesque site)
   → **Site configuration → Environment variables**.
2. Add a new variable:
   - Key: `REGISTRATION_SHEETS_WEBHOOK_URL`
   - Value: the `/exec` URL you copied
3. Save. Server actions read env vars at request time, so this takes effect on the
   **next form submission** — no redeploy needed.

That's it. Every registration from then on lands in the sheet within a second or two.
If the webhook is ever down or misconfigured, nothing breaks — the database save
(the real source of truth) still succeeds either way.
