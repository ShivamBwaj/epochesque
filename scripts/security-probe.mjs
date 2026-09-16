import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
if (!url || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY")
  process.exit(1)
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } })

let failures = 0

async function check(name, fn) {
  try {
    const { denied, detail } = await fn()
    const status = denied ? "DENIED  " : "ALLOWED  SECURITY HOLE"
    if (!denied) failures++
    console.log(`[${status}] ${name} — ${detail}`)
  } catch (e) {
    console.log(`[ERROR   ] ${name} — ${e.message}`)
    failures++
  }
}

async function main() {
  console.log(`\nSecurity probe against ${url} using ANON key\n` + "=".repeat(60))

  await check("read teams table", async () => {
    const { data, error } = await anon.from("teams").select("*")
    return { denied: !!error || (data ?? []).length === 0, detail: error ? error.message : `${data.length} rows visible` }
  })

  await check("read scores table", async () => {
    const { data, error } = await anon.from("scores").select("*")
    return { denied: !!error || (data ?? []).length === 0, detail: error ? error.message : `${data.length} rows visible` }
  })

  await check("read announcements table", async () => {
    const { data, error } = await anon.from("announcements").select("*")
    return { denied: !!error || (data ?? []).length === 0, detail: error ? error.message : `${data.length} rows visible` }
  })

  await check("read leaderboard_visibility table", async () => {
    const { data, error } = await anon.from("leaderboard_visibility").select("*")
    return { denied: !!error || (data ?? []).length === 0, detail: error ? error.message : `${data.length} rows visible` }
  })

  await check("read admins table", async () => {
    const { data, error } = await anon.from("admins").select("*")
    return { denied: !!error || (data ?? []).length === 0, detail: error ? error.message : `${data.length} rows visible` }
  })

  await check("read problem_statements table", async () => {
    const { data, error } = await anon.from("problem_statements").select("*")
    return { denied: !!error || (data ?? []).length === 0, detail: error ? error.message : `${data.length} rows visible` }
  })

  await check("insert into teams", async () => {
    const { error } = await anon.from("teams").insert({ team_code: "HACK", team_name: "HACK", leader_email: "h@h.h" })
    return { denied: !!error, detail: error ? error.message : "INSERT WENT THROUGH" }
  })

  await check("update teams", async () => {
    const { error } = await anon.from("teams").update({ status: "finalist" }).eq("team_code", "T-1")
    return { denied: !!error, detail: error ? error.message : "UPDATE WENT THROUGH" }
  })

  await check("delete from teams", async () => {
    const { error } = await anon.from("teams").delete().neq("team_code", "")
    return { denied: !!error, detail: error ? error.message : "DELETE WENT THROUGH" }
  })

  await check("insert scores", async () => {
    const { error } = await anon.from("scores").insert({ team_id: "00000000-0000-0000-0000-000000000000", round: "round1", total_score: 999 })
    return { denied: !!error, detail: error ? error.message : "INSERT WENT THROUGH" }
  })

  await check("call roll_problem_statement RPC as anon", async () => {
    const { error } = await anon.rpc("roll_problem_statement")
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("call roll_problem_statement_for RPC as anon", async () => {
    const { error } = await anon.rpc("roll_problem_statement_for", { p_team_id: "00000000-0000-0000-0000-000000000000" })
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("read attendance table", async () => {
    const { data, error } = await anon.from("attendance").select("*")
    return { denied: !!error, detail: error ? error.message : `${(data ?? []).length} rows visible` }
  })

  await check("write attendance table", async () => {
    const { error } = await anon.from("attendance").insert({ day: 1, registration_id: "00000000-0000-0000-0000-000000000000", is_present: true })
    return { denied: !!error, detail: error ? error.message : "INSERT WENT THROUGH" }
  })

  await check("read game_slots table", async () => {
    const { data, error } = await anon.from("game_slots").select("*")
    return { denied: !!error, detail: error ? error.message : `${(data ?? []).length} rows visible` }
  })

  await check("call book_game_slot RPC as anon", async () => {
    const { error } = await anon.rpc("book_game_slot", { p_slot_id: "00000000-0000-0000-0000-000000000000" })
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("read registrations table", async () => {
    const { data, error } = await anon.from("registrations").select("*")
    return { denied: !!error, detail: error ? error.message : `${(data ?? []).length} rows visible` }
  })

  await check("read team_members table", async () => {
    const { data, error } = await anon.from("team_members").select("*")
    return { denied: !!error, detail: error ? error.message : `${(data ?? []).length} rows visible` }
  })

  await check("call create_team_with_members RPC as anon", async () => {
    const { error } = await anon.rpc("create_team_with_members", { p_team_name: "HACK", p_teammate_registration_ids: [] })
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("call search_teammates RPC as anon", async () => {
    const { error } = await anon.rpc("search_teammates", { p_query: "" })
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("call get_my_team RPC as anon", async () => {
    const { data, error } = await anon.rpc("get_my_team")
    const denied = !!error || (data ?? []).length === 0
    return { denied, detail: error ? error.message : `${(data ?? []).length} rows visible` }
  })

  await check("call admin_move_team_member RPC as anon", async () => {
    const { error } = await anon.rpc("admin_move_team_member", { p_registration_id: "00000000-0000-0000-0000-000000000000", p_new_team_id: null })
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("call admin_set_team_leader RPC as anon", async () => {
    const { error } = await anon.rpc("admin_set_team_leader", { p_team_id: "00000000-0000-0000-0000-000000000000", p_registration_id: "00000000-0000-0000-0000-000000000000" })
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("call admin_create_team_with_members RPC as anon", async () => {
    const { error } = await anon.rpc("admin_create_team_with_members", { p_team_name: "HACK", p_registration_ids: [] })
    return { denied: !!error, detail: error ? error.message : "RPC EXECUTED" }
  })

  await check("read integration_secrets table", async () => {
    const { data, error } = await anon.from("integration_secrets").select("*")
    return { denied: !!error, detail: error ? error.message : `${(data ?? []).length} rows visible` }
  })

  await check("list certificates storage bucket", async () => {
    const { data, error } = await anon.storage.from("certificates").list()
    return { denied: !!error || (data ?? []).length === 0, detail: error ? error.message : `${(data ?? []).length} objects visible` }
  })

  await check("list submissions storage bucket", async () => {
    const { data, error } = await anon.storage.from("submissions").list("", { limit: 10 })
    return { denied: !!error || (data?.length ?? 0) === 0, detail: error ? error.message : "0 objects visible (RLS filtered)" }
  })

  await check("direct download from submissions bucket", async () => {
    const res = await fetch(`${url}/storage/v1/object/submissions/round1/00000000-0000-0000-0000-000000000000/x.pptx`, {
      headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    })
    const ok = res.ok
    return { denied: !ok, detail: `HTTP ${res.status} ${res.statusText}${ok ? " — DOWNLOAD WENT THROUGH" : ""}` }
  })

  await check("signed-URL-less render URL for submissions bucket", async () => {
    const res = await fetch(`${url}/storage/v1/object/public/submissions/round1/x.pptx`)
    const ok = res.ok
    return { denied: !ok, detail: `HTTP ${res.status} ${res.statusText}${ok ? " — PUBLIC ACCESS" : ""}` }
  })

  await check("read event_settings (public by design)", async () => {
    const { data, error } = await anon.from("event_settings").select("key")
    const allowed = ["event_start", "ps_release_at", "round1_deadline", "final_deadline", "event_end", "roll_open", "final_open", "gaming_open", "certificates_published", "ppt_template_path", "projects_published"]
    const expected = !error && data.length === allowed.length && data.every((r) => allowed.includes(r.key))
    return { denied: expected, detail: expected ? "OK — intentionally public timing info + gate flags only" : `UNEXPECTED: ${error?.message ?? data.length + " keys"}` }
  })

  await check("insert into people (speakers/OC)", async () => {
    const { error } = await anon.from("people").insert({ kind: "speaker", name: "HACK" })
    return { denied: !!error, detail: error ? error.message : "INSERT WENT THROUGH" }
  })

  await check("delete from people (speakers/OC)", async () => {
    const { error } = await anon.from("people").delete().neq("name", "")
    return { denied: !!error, detail: error ? error.message : "DELETE WENT THROUGH" }
  })

  await check("read people table (published only, by design)", async () => {
    const { data, error } = await anon.from("people").select("kind, name, is_published")
    const hiddenLeak = (data ?? []).some((r) => r.is_published === false)
    return { denied: !error && !hiddenLeak, detail: error ? error.message : hiddenLeak ? "UNPUBLISHED ROWS VISIBLE" : `${data.length} published rows visible` }
  })

  await check("leaderboard views while unpublished (0 rows = gated)", async () => {
    const { data: r1, error } = await anon.from("leaderboard_round1_public").select("*")
    const { data: fin } = await anon.from("leaderboard_final_public").select("*")
    const { data: winners } = await anon.from("winners_public").select("*")
    const total = (r1?.length ?? 0) + (fin?.length ?? 0) + (winners?.length ?? 0)
    const gated = !!error && total === 0 ? false : total === 0
    return { denied: gated, detail: error ? error.message : `published rows visible: ${total} (0 expected when unpublished)` }
  })

  console.log("=".repeat(60))
  if (failures > 0) {
    console.log(`RESULT: ${failures} probe(s) FAILED — fix before launch`)
    process.exit(1)
  }
  console.log("RESULT: all probes correctly denied — database is locked down")
}

main()
