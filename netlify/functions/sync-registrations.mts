import { createClient } from "@supabase/supabase-js";

// Polls the Epochesque Registrations Google Sheet and folds any row that
// isn't already in `registrations` into the database. The sheet is
// normally a DB -> sheet mirror (register-site pushes into it on every
// submission), but OC sometimes types a walk-in straight into the sheet
// by hand — this is what catches those and keeps the DB the source of
// truth for everything downstream (signup, team formation, attendance).
//
// Runs on a schedule (see `config` below) — Netlify Scheduled Functions,
// no separate cron infra needed. Safe to also invoke manually via its URL.

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1MyjOlFs-cPLBA8aSDn9-PT0R33jErVPCYT2FWrN9MSQ/export?format=csv&gid=0";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

interface SheetRow {
  name: string;
  regNo: string;
  phone: string;
  email: string;
}

function parseSheet(csv: string): SheetRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = {
    name: headers.indexOf("name"),
    regNo: headers.indexOf("reg no"),
    phone: headers.indexOf("phone"),
    email: headers.indexOf("email"),
  };
  if (idx.name === -1 || idx.regNo === -1) return [];

  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const regNo = (cells[idx.regNo] ?? "").trim().toUpperCase();
    const name = (cells[idx.name] ?? "").trim();
    if (!regNo || !name) continue;
    rows.push({
      name: name.slice(0, 120),
      regNo: regNo.slice(0, 30),
      phone: (cells[idx.phone] ?? "").trim().slice(0, 20),
      email: (cells[idx.email] ?? "").trim().toLowerCase().slice(0, 200),
    });
  }
  return rows;
}

export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("sync-registrations: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return new Response("missing env", { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) {
    console.error("sync-registrations: sheet fetch failed", res.status);
    return new Response("sheet fetch failed", { status: 502 });
  }
  const csv = await res.text();
  const rows = parseSheet(csv);
  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, checked: 0, added: 0 }), { status: 200 });
  }

  const { data: existing, error: existingErr } = await admin.from("registrations").select("reg_no");
  if (existingErr) {
    console.error("sync-registrations: could not read existing registrations", existingErr.message);
    return new Response("db read failed", { status: 500 });
  }
  const existingRegNos = new Set((existing ?? []).map((r) => r.reg_no.toUpperCase()));

  const missing = rows.filter((r) => !existingRegNos.has(r.regNo));
  let added = 0;
  for (const r of missing) {
    if (!r.email) continue; // email required by schema/signup matching
    const { error } = await admin
      .from("registrations")
      .insert({ name: r.name, reg_no: r.regNo, phone: r.phone, email: r.email });
    if (!error) added++;
  }

  console.log(`sync-registrations: checked ${rows.length}, added ${added}`);
  return new Response(JSON.stringify({ ok: true, checked: rows.length, added }), { status: 200 });
};

export const config = {
  schedule: "*/5 * * * *",
};
