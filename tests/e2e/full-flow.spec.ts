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
  await expect(page.locator("body")).toContainText("EPOCH")
  await expect(page.locator("body")).toContainText("How it works")

  await page.goto("/speakers")
  await expect(page.locator("body")).toContainText("Speakers")

  await page.goto("/leaderboard")
  await expect(page.locator("body")).toContainText("Revealed after judging")

  await page.goto("/gallery")
  await expect(page.locator("body")).toContainText("Photos drop after the event")
})

test("unauthenticated users are redirected from protected areas", async ({ page }) => {
  await page.goto("/dashboard")
  await page.waitForURL("**/login**")
  await page.goto("/admin")
  await page.waitForURL("**/login**")
})

test("team journey: login, roll PS, lock, submit round 1", async ({ page }) => {
  await login(page, TEAM_EMAIL, TEAM_PASSWORD)
  await page.waitForURL("**/dashboard")
  await expect(page.locator("body")).toContainText(TEAM_CODE)

  await page.goto("/dashboard/problem-statement")
  await page.click('button:has-text("Roll")')
  await expect(page.locator("body")).toContainText("LOCKED IN AT", { timeout: 30_000 })
  await expect(page.locator("body")).toContainText("E2E Problem Statement")

  await page.reload()
  await expect(page.locator("body")).toContainText("LOCKED IN AT")
  await expect(page.locator("body")).toContainText("E2E Problem Statement")
  await expect(page.locator("body")).toContainText("no re-roll", { ignoreCase: true })

  await page.goto("/dashboard/submit/round1")
  await page.setInputFiles('input[type="file"]', {
    name: "e2e-deck.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: Buffer.from("PK fake pptx for e2e"),
  })
  await page.click('button:has-text("Upload deck")')
  await expect(page.locator("body")).toContainText("Round 1 submission received", { timeout: 30_000 })
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
  await expect(page.locator("body")).toContainText("Revealed after judging")

  await page.goto("/admin/scoring?round=round1")
  await page.click('button:has-text("Publish")')
  await expect(page.locator('text="published"').first()).toBeVisible({ timeout: 30_000 })
  await page.goto("/leaderboard")
  await expect(page.locator("body")).toContainText(TEAM_CODE)
  await expect(page.locator("body")).toContainText("87.5")

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
  await expect(page.locator("body")).toContainText("Revealed after judging")
})

test("bad credentials are rejected", async ({ page }) => {
  await login(page, "nobody@epoch.local", "wrong-password-123")
  await expect(page.locator("body")).toContainText("Invalid email or password")
})
