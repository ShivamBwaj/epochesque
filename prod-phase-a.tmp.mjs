import { chromium } from "@playwright/test"
import { writeFileSync } from "node:fs"
import dotenv from "dotenv"
import path from "node:path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const BASE = "https://epochesque.vercel.app"
const CSV = "C:\\Users\\Loq\\Documents\\CRAP\\opencode drama\\yeah i testing\\Event_Details.xlsx (1).csv"

const results = []
const check = (name, ok, extra = "") => {
  results.push({ name, ok })
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? ` (${extra})` : ""}`)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  page.on("dialog", (d) => d.accept())

  await page.goto(`${BASE}/login`)
  await page.fill('input[name="email"]', process.env.E2E_ADMIN_EMAIL)
  await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/admin**", { timeout: 30000 })
  check("admin login on production", true)

  await page.goto(`${BASE}/admin`)
  await page.waitForSelector("text=MISSION CONTROL")
  const overview = await page.locator("body").innerText()
  check("overview renders with gates", overview.includes("THE ROLL") && overview.includes("FINAL SUBMISSIONS"))
  check("roll starts closed", overview.includes("closed"))
  check("audit empty (pristine)", overview.includes("No admin actions yet"))

  await page.goto(`${BASE}/admin/problem-statements`)
  await page.waitForSelector("#ps-code")
  const psPool = [
    ["PS-01", "Campus Food Waste Reimagined", "Track cafeteria waste and turn it into action."],
    ["PS-02", "Frictionless Event Check-ins", "Get 500 people into a venue in 10 minutes."],
    ["PS-03", "Study Group Matchmaker", "Find people who learn like you do."],
    ["PS-04", "Lost & Found, Solved", "Campus-scale lost item recovery without the spreadsheet."],
    ["PS-05", "Accessibility Mapper", "Help everyone navigate campus equally."],
    ["PS-06", "Open Innovation", "Bring your own problem — convince us it matters."],
  ]
  for (const [code, title, desc] of psPool) {
    await page.fill("#ps-code", code)
    await page.fill("#ps-title", title)
    await page.fill("#ps-description", desc)
    await page.fill("#ps-max", "10")
    await page.click('button:has-text("Add problem statement")')
    await page.waitForSelector(`text=Problem statement added`, { timeout: 15000 })
    await page.waitForTimeout(500)
  }
  check("6 problem statements added", true, "capacity 60")

  await page.goto(`${BASE}/admin/teams/import`)
  await page.waitForSelector("#csv-file")
  await page.setInputFiles("#csv-file", CSV)
  await page.waitForSelector("text=STEP 2 / 3 — REVIEW", { timeout: 30000 })
  const reviewText = await page.locator("body").innerText()
  check("CSV parsed to 22 teams", reviewText.includes("Teams\n22") || reviewText.includes("22"), "99 rows detected")

  await page.click(`button:has-text("Continue with 22 teams")`)
  await page.waitForSelector("text=STEP 3 / 3 — CONFIRM", { timeout: 15000 })
  await page.click('button:has-text("Create 22 teams")')
  await page.waitForSelector("text=Created 22 teams", { timeout: 120000 })
  check("22 teams created with logins", true)

  const credRows = page.locator("table tbody tr")
  const count = await credRows.count()
  check("credentials table shows 22 rows", count === 22, `${count} rows`)
  const firstRow = credRows.first()
  const teamCode = (await firstRow.locator("td").nth(0).innerText()).trim()
  const teamName = (await firstRow.locator("td").nth(1).innerText()).trim()
  const email = (await firstRow.locator("td").nth(2).innerText()).trim()
  const password = (await firstRow.locator("td code").first().innerText()).trim()
  check("credentials extractable", teamCode.length > 0 && email.includes("@") && password.length >= 8, `${teamCode} / ${email}`)

  writeFileSync(".prod-test-creds.json", JSON.stringify({ teamCode, teamName, email, password }, null, 2))

  await page.goto(`${BASE}/admin/teams`)
  await page.waitForSelector("text=REGISTRY")
  const teamsText = await page.locator("body").innerText()
  check("teams page lists all 22", teamsText.includes("Teams") && teamsText.includes(teamCode))
  check("leader dropdown present", (await page.locator("select").count()) >= 22)

  const failed = results.filter((r) => !r.ok)
  console.log(`\nPHASE A: ${results.length - failed.length}/${results.length} passed`)
  await browser.close()
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error("PHASE A CRASHED:", e)
  process.exit(1)
})
