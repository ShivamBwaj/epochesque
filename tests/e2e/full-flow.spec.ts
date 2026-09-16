import { test, expect, type Page } from "@playwright/test"
import { seed, cleanup, TEAM_EMAIL, TEAM_PASSWORD, TEAM_CODE, type SeedData } from "./helpers"

let data: SeedData
let adminPassword: string

test.beforeAll(async () => {
  adminPassword = process.env.E2E_ADMIN_PASSWORD!
  if (!adminPassword) throw new Error("E2E_ADMIN_PASSWORD missing")
  data = await seed()
})

test.afterAll(async () => {
  if (data) await cleanup(data)
})

async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
}

test("public pages render", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("body")).toContainText("Epochesque")
  await expect(page.locator("body")).toContainText("How it works")
  await expect(page.locator("body")).toContainText("You don't choose")

  await page.goto("/speakers")
  await expect(page.locator("body")).toContainText("Speakers")

  await page.goto("/leaderboard")
  await page.waitForURL("**/login**")

  await page.goto("/gallery")
  await expect(page.locator("body")).toContainText("Photos drop after the event")
})

test("unauthenticated users are redirected from protected areas", async ({ page }) => {
  await page.goto("/dashboard")
  await page.waitForURL("**/login**")
  await page.goto("/admin")
  await page.waitForURL("**/login**")
})

test("team journey: login, admin rolls on stage, PS locks, submit PPT", async ({ page }) => {
  await login(page, TEAM_EMAIL, TEAM_PASSWORD)
  await page.waitForURL("**/dashboard")
  await expect(page.locator("body")).toContainText(TEAM_CODE)

  await page.goto("/dashboard/problem-statement")
  await expect(page.locator("body")).toContainText("WAITING FOR YOUR TURN ON STAGE")

  const adminPage = await page.context().browser()!.newPage()
  await login(adminPage, process.env.E2E_ADMIN_EMAIL!, adminPassword)
  await adminPage.waitForURL("**/admin")
  await adminPage.goto("/admin/roll")
  await expect(adminPage.locator("body")).toContainText("Roll Stage")
  await adminPage.locator('button:has-text("ROLL IT")').first().click()
  await expect(adminPage.locator("body")).toContainText("the roll has spoken", { timeout: 30_000 })
  await adminPage.close()

  await page.reload()
  await expect(page.locator("body")).toContainText("LOCKED IN AT")
  await expect(page.locator("body")).toContainText("E2E Problem Statement")
  await expect(page.locator("body")).toContainText("no re-roll", { ignoreCase: true })

  await page.goto("/dashboard/submit/round1")
  await page.setInputFiles('input[type="file"]', {
    name: "e2e-deck.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: Buffer.from("PK\u0003\u0004 fake pptx for e2e"),
  })
  await page.click('button:has-text("Upload deck")')
  await expect(page.locator("body")).toContainText("PPT submission received", { timeout: 30_000 })
  await expect(page.locator("body")).toContainText("e2e-deck.pptx")
})

test("team cannot see other teams or internal tables via the app", async ({ page }) => {
  await login(page, TEAM_EMAIL, TEAM_PASSWORD)
  await page.waitForURL("**/dashboard")
  await page.goto("/admin/teams")
  await page.waitForURL("**/dashboard")
})

test("admin journey: score, publish leaderboard, winners", async ({ page }) => {
  page.on("dialog", (d) => d.accept())

  await login(page, process.env.E2E_ADMIN_EMAIL!, adminPassword)
  await page.waitForURL("**/admin")

  await page.goto("/admin/teams")
  await expect(page.locator("body")).toContainText(TEAM_CODE)

  await page.goto("/admin/scoring?round=round1")
  await page.fill(`input[name="score_${data.teamId}"]`, "87.5")
  await page.fill(`input[name="notes_${data.teamId}"]`, "e2e test score")
  await page.click('button:has-text("Save")')
  await expect(page.locator("body")).toContainText("Saved", { timeout: 20_000 })

  await page.goto("/leaderboard")
  await expect(page.locator("body")).toContainText("Nothing published yet")

  await page.goto("/admin/scoring?round=round1")
  await page.click('button:has-text("Publish")')
  await expect(page.locator('text="published"').first()).toBeVisible({ timeout: 30_000 })
  await page.goto("/leaderboard")
  await expect(page.locator("body")).toContainText(TEAM_CODE)
  await expect(page.locator("body")).toContainText("87.5")

  await page.goto("/admin/scoring?round=round1")
  await page.fill(`input[name="score_${data.teamId}"]`, "99")
  await page.click('button:has-text("Save")')
  await expect(page.locator("body")).toContainText("Unpublish it before editing scores", { timeout: 20_000 })

  await page.goto("/admin/announce-winners")
  await page.fill("#winners-title", "E2E Winners")
  await page.click('button:has-text("Add entry")')
  await page.fill("#code-0", TEAM_CODE)
  await page.fill("#name-0", "E2E Test Team")
  await page.click('button:has-text("Save & publish")')
  await expect(page.locator("text=Winners published").first()).toBeVisible({ timeout: 20_000 })
  await page.goto("/leaderboard")
  await expect(page.locator("body")).toContainText("E2E Winners")

  await page.goto("/admin/scoring?round=round1")
  await page.click('button:has-text("Unpublish")')
  await expect(page.locator('text="unpublished"').first()).toBeVisible({ timeout: 30_000 })
  await page.goto("/leaderboard")
  await expect(page.locator("body")).toContainText("Nothing published yet")
})

test("bad credentials are rejected", async ({ page }) => {
  await login(page, "nobody@epoch.local", "wrong-password-123")
  await expect(page.locator("body")).toContainText("Invalid email or password")
})

test("admin: score CSV import, notices, audit trail", async ({ page }) => {
  page.on("dialog", (d) => d.accept())

  await login(page, process.env.E2E_ADMIN_EMAIL!, adminPassword)
  await page.waitForURL("**/admin")

  await page.goto("/admin/scoring?round=round1")
  await page.click('button:has-text("Import scores from CSV")')
  await page.setInputFiles('input[type="file"][accept=".csv,text/csv"]', {
    name: "scores.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`team_code,score,notes\n${TEAM_CODE},95,bulk import\nGHOST-1,50,unknown team\n`),
  })
  await page.click('button:has-text("Import 2 scores")')
  await expect(page.locator("body")).toContainText("Imported 1 score", { timeout: 20_000 })
  await expect(page.locator("body")).toContainText("Unknown team code: GHOST-1")

  await page.goto("/admin/notices")
  await page.click('button:has-text("New notice")')
  await page.fill("#notice-title", "E2E Notice: decks due soon")
  await page.fill("#notice-text", "Upload your decks before the buzzer.")
  await page.click('button:has-text("Create notice")')
  await expect(page.locator("body")).toContainText("Notice created", { timeout: 20_000 })

  await page.click('button:has-text("Publish")')
  await page.waitForTimeout(1500)

  await page.goto("/admin/audit")
  await expect(page.locator("body")).toContainText("scores.import", { timeout: 20_000 })
  await expect(page.locator("body")).toContainText("notice.publish")
})

test("team sees published notice on dashboard", async ({ page }) => {
  await login(page, TEAM_EMAIL, TEAM_PASSWORD)
  await page.waitForURL("**/dashboard")
  await expect(page.locator("body")).toContainText("E2E Notice: decks due soon", { timeout: 20_000 })
})

test("team: fake pptx content rejected by magic bytes", async ({ page }) => {
  await login(page, TEAM_EMAIL, TEAM_PASSWORD)
  await page.waitForURL("**/dashboard")

  await page.goto("/dashboard/submit/round1")
  await page.setInputFiles('input[type="file"]', {
    name: "evil.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: Buffer.from("this is definitely not a real office document"),
  })
  await page.click('button:has-text("Upload deck")')
  await expect(page.locator("body")).toContainText("not a valid PPTX", { timeout: 20_000 })
})
