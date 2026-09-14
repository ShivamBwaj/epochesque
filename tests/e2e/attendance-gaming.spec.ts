import { test, expect, type Page } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!url || !serviceKey) throw new Error("Missing Supabase env for e2e seed")

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const RUN = Date.now().toString(36)
const TEAM_EMAIL = `e2e-att-${RUN}@epoch.local`
const TEAM_PASSWORD = `Ep-E2eAtt-${RUN}!7`
const TEAM_CODE = `E2E-ATT-${RUN}`
const TEAM2_EMAIL = `e2e-att2-${RUN}@epoch.local`
const TEAM2_CODE = `E2E-ATT2-${RUN}`
const MEMBERS = [
  { name: "Att Leader", email: TEAM_EMAIL, member_id: "ATT-001" },
  { name: "Att Member Two", email: null, member_id: "ATT-002" },
  { name: "Att Member Three", email: null, member_id: "ATT-003" },
]

let teamUserId = ""
let team2UserId = ""
let startedAt = ""
let gamingWasOpen = false

test.beforeAll(async () => {
  startedAt = new Date().toISOString()

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: TEAM_EMAIL,
    password: TEAM_PASSWORD,
    email_confirm: true,
    user_metadata: { team_code: TEAM_CODE, role: "team", e2e: RUN },
  })
  if (authErr || !authUser?.user) throw new Error(`seed user failed: ${authErr?.message}`)
  teamUserId = authUser.user.id

  const { error: teamErr } = await admin.from("teams").insert({
    team_code: TEAM_CODE,
    team_name: `E2E Attendance Team ${RUN}`,
    members: MEMBERS,
    leader_email: TEAM_EMAIL,
    auth_user_id: teamUserId,
    status: "registered",
  })
  if (teamErr) {
    await admin.auth.admin.deleteUser(teamUserId).catch(() => {})
    throw new Error(`seed team failed: ${teamErr.message}`)
  }

  const { data: authUser2, error: authErr2 } = await admin.auth.admin.createUser({
    email: TEAM2_EMAIL,
    password: TEAM_PASSWORD,
    email_confirm: true,
    user_metadata: { team_code: TEAM2_CODE, role: "team", e2e: RUN },
  })
  if (authErr2 || !authUser2?.user) throw new Error(`seed user2 failed: ${authErr2?.message}`)
  team2UserId = authUser2.user.id

  const { error: teamErr2 } = await admin.from("teams").insert({
    team_code: TEAM2_CODE,
    team_name: `E2E Scoring Team ${RUN}`,
    members: [{ name: "Scoring Leader", email: TEAM2_EMAIL }],
    leader_email: TEAM2_EMAIL,
    auth_user_id: team2UserId,
    status: "registered",
  })
  if (teamErr2) {
    await admin.auth.admin.deleteUser(team2UserId).catch(() => {})
    throw new Error(`seed team2 failed: ${teamErr2.message}`)
  }

  await admin.from("leaderboard_visibility").upsert({ round: "round1", is_published: false, published_at: null }, { onConflict: "round" })

  // Slot booking is gated behind the admin "gaming_open" toggle — force it on
  // for this run so the booking test below doesn't get rejected.
  gamingWasOpen = (await admin.from("event_settings").select("value").eq("key", "gaming_open").maybeSingle()).data?.value === true
  await admin.from("event_settings").upsert({ key: "gaming_open", value: true as never }, { onConflict: "key" })
})

test.afterAll(async () => {
  await admin.from("teams").delete().in("team_code", [TEAM_CODE, TEAM2_CODE])
  await admin.auth.admin.deleteUser(teamUserId).catch(() => {})
  await admin.auth.admin.deleteUser(team2UserId).catch(() => {})
  await admin.from("leaderboard_visibility").upsert({ round: "round1", is_published: false, published_at: null }, { onConflict: "round" })
  await admin.from("admin_audit").delete().gte("created_at", startedAt)
  await admin.from("event_settings").upsert({ key: "gaming_open", value: gamingWasOpen as never }, { onConflict: "key" })
})

async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
}

async function attendanceRows(day: number) {
  const { data: team } = await admin.from("teams").select("id").eq("team_code", TEAM_CODE).single()
  const { data } = await admin.from("attendance").select("member_key, is_present").eq("team_id", team!.id).eq("day", day)
  return (data ?? []).sort((a: { member_key: string }, b: { member_key: string }) => a.member_key.localeCompare(b.member_key))
}

async function waitForDb(check: () => Promise<boolean>, timeout = 15_000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error("DB state did not converge in time")
}

test("attendance: mark whole team, tweak one member, days independent, CSV button", async ({ page }) => {
  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
  await page.waitForURL("**/admin")

  await page.goto("/admin/attendance")
  await expect(page.locator("body")).toContainText("Attendance")
  await expect(page.locator("body")).toContainText(TEAM_CODE)

  const card = page.locator(".card", { hasText: TEAM_CODE }).first()
  await expect(card.locator('input[type="checkbox"]')).toHaveCount(3)

  await card.locator('button[title="Mark whole team present"]').click()
  await expect(card.locator('input[type="checkbox"]:checked')).toHaveCount(3, { timeout: 15_000 })
  await waitForDb(async () => (await attendanceRows(1)).filter((r: { is_present: boolean }) => r.is_present).length === 3)

  await card.locator('input[type="checkbox"]').first().click()
  await expect(card.locator('input[type="checkbox"]:checked')).toHaveCount(2, { timeout: 15_000 })
  await waitForDb(async () => (await attendanceRows(1)).filter((r: { is_present: boolean }) => r.is_present).length === 2)

  await page.goto("/admin/attendance?day=2")
  const day2card = page.locator(".card", { hasText: TEAM_CODE }).first()
  await expect(day2card.locator('input[type="checkbox"]:checked')).toHaveCount(0)

  await day2card.locator('button[title="Mark whole team present"]').click()
  await expect(day2card.locator('input[type="checkbox"]:checked')).toHaveCount(3, { timeout: 15_000 })
  await waitForDb(async () => (await attendanceRows(2)).filter((r: { is_present: boolean }) => r.is_present).length === 3)

  await page.goto("/admin/attendance")
  const day1again = page.locator(".card", { hasText: TEAM_CODE }).first()
  await expect(day1again.locator('input[type="checkbox"]:checked')).toHaveCount(2, { timeout: 15_000 })

  await expect(page.locator('button:has-text("Download CSV")')).toBeVisible()
  if (!process.env.ATTENDANCE_SHEETS_WEBHOOK_URL) {
    await expect(page.locator("body")).toContainText("Connect Google Sheet")
  }

  const d1 = await attendanceRows(1)
  expect(d1).toHaveLength(3)
  expect(d1.filter((r: { is_present: boolean }) => r.is_present)).toHaveLength(2)
  const d2 = await attendanceRows(2)
  expect(d2).toHaveLength(3)
  expect(d2.filter((r: { is_present: boolean }) => r.is_present)).toHaveLength(3)
})

test("scoring: two panels save concurrently without clobbering each other", async ({ browser }) => {
  const teamIds: Record<string, string> = {}
  for (const code of [TEAM_CODE, TEAM2_CODE]) {
    const { data } = await admin.from("teams").select("id").eq("team_code", code).single()
    teamIds[code] = data!.id
  }

  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const panelA = await ctxA.newPage()
  const panelB = await ctxB.newPage()

  await login(panelA, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
  await panelA.waitForURL("**/admin")
  await login(panelB, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
  await panelB.waitForURL("**/admin")

  await panelA.goto("/admin/scoring?round=round1")
  await panelB.goto("/admin/scoring?round=round1")

  await panelA.fill(`input[name="score_${teamIds[TEAM_CODE]}"]`, "55")
  await panelA.click('button:has-text("Save")')
  await expect(panelA.locator("body")).toContainText("Saved 1 score", { timeout: 20_000 })

  await panelB.reload()
  await expect(panelB.locator(`input[name="score_${teamIds[TEAM_CODE]}"]`)).toHaveValue("55")

  await panelA.fill(`input[name="score_${teamIds[TEAM_CODE]}"]`, "70")
  await panelA.click('button:has-text("Save")')
  await expect(panelA.locator("body")).toContainText("Saved 1 score", { timeout: 20_000 })

  await panelB.fill(`input[name="score_${teamIds[TEAM2_CODE]}"]`, "66")
  await panelB.click('button:has-text("Save")')
  await expect(panelB.locator("body")).toContainText("Saved 1 score", { timeout: 20_000 })

  const { data: scores } = await admin.from("scores").select("team_id, total_score").eq("round", "round1")
  const map = new Map((scores ?? []).map((s: { team_id: string; total_score: number }) => [s.team_id, Number(s.total_score)]))
  expect(map.get(teamIds[TEAM_CODE])).toBe(70)
  expect(map.get(teamIds[TEAM2_CODE])).toBe(66)

  await ctxA.close()
  await ctxB.close()
})

test("final leaderboard is weighted 20/10/70", async ({ page }) => {
  const ids: Record<string, string> = {}
  for (const code of [TEAM_CODE, TEAM2_CODE]) {
    const { data } = await admin.from("teams").select("id").eq("team_code", code).single()
    ids[code] = data!.id
  }

  await admin.from("scores").upsert([
    { team_id: ids[TEAM_CODE], round: "round1", total_score: 100 },
    { team_id: ids[TEAM_CODE], round: "round2", total_score: 100 },
    { team_id: ids[TEAM_CODE], round: "final", total_score: 100 },
    { team_id: ids[TEAM2_CODE], round: "round1", total_score: 100 },
    { team_id: ids[TEAM2_CODE], round: "round2", total_score: 0 },
    { team_id: ids[TEAM2_CODE], round: "final", total_score: 0 },
  ], { onConflict: "team_id,round" })

  await admin.from("leaderboard_visibility").upsert({ round: "final", is_published: true, published_at: new Date().toISOString() }, { onConflict: "round" })

  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
  await page.waitForURL("**/admin")
  await page.goto("/leaderboard")
  await expect(page.locator("body")).toContainText("Weighted Score", { timeout: 20_000 })
  await expect(page.locator("body")).toContainText("100")

  const { data: finalRows } = await admin.from("leaderboard_final_public").select("team_code, total_score")
  const map = new Map((finalRows ?? []).map((r: { team_code: string; total_score: number }) => [r.team_code, Number(r.total_score)]))
  expect(map.get(TEAM_CODE)).toBe(100)
  expect(map.get(TEAM2_CODE)).toBe(20)

  await admin.from("leaderboard_visibility").upsert({ round: "final", is_published: false, published_at: null }, { onConflict: "round" })
})

test("gaming: team books a slot, sees it locked, admin clears it, team can rebook", async ({ page }) => {
  await login(page, TEAM_EMAIL, TEAM_PASSWORD)
  await page.waitForURL("**/dashboard")

  await page.goto("/dashboard/gaming")
  await expect(page.locator("body")).toContainText("Gaming Slots")

  await page.locator('button:has-text("OPEN")').first().click()
  await expect(page.locator("body")).toContainText("YOUR SLOT — LOCKED", { timeout: 20_000 })

  await page.goto("/dashboard")
  await expect(page.locator("body")).toContainText("GAMING SLOT")

  const adminPage = await page.context().browser()!.newPage()
  await login(adminPage, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!)
  await adminPage.waitForURL("**/admin")
  await adminPage.goto("/admin/gaming")
  await expect(adminPage.locator("body")).toContainText(TEAM_CODE)

  const row = adminPage.locator("div.flex.items-center.gap-3", { hasText: TEAM_CODE }).first()
  await row.locator('button:has-text("Clear")').click()
  await expect(adminPage.locator("body")).not.toContainText(TEAM_CODE, { timeout: 20_000 })
  await adminPage.close()

  await page.goto("/dashboard/gaming")
  await expect(page.locator("body")).toContainText("Pick carefully", { timeout: 20_000 })
  await expect(page.locator('button:has-text("OPEN")').first()).toBeVisible()
})
