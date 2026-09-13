import { chromium } from "@playwright/test"
import { readFileSync } from "node:fs"
import { randomBytes } from "node:crypto"
import dotenv from "dotenv"
import path from "node:path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const BASE = "https://epochesque.vercel.app"
const creds = JSON.parse(readFileSync(".prod-test-creds.json", "utf8"))

const results = []
const check = (name, ok, extra = "") => {
  results.push({ name, ok })
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${extra ? ` (${extra})` : ""}`)
}

async function adminLogin(page) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[name="email"]', process.env.E2E_ADMIN_EMAIL)
  await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/admin**", { timeout: 30000 })
}

async function teamLogin(page) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[name="email"]', creds.email)
  await page.fill('input[name="password"]', creds.password)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/dashboard**", { timeout: 30000 })
}

async function main() {
  const browser = await chromium.launch()
  const teamCtx = await browser.newContext()
  const adminCtx = await browser.newContext()
  const team = await teamCtx.newPage()
  const admin = await adminCtx.newPage()
  for (const p of [team, admin]) p.on("dialog", (d) => d.accept())

  await teamLogin(team)
  const dash = await team.locator("body").innerText()
  check("team login with generated password", dash.includes(creds.teamCode))
  check("dashboard shows team name", dash.includes(creds.teamName.split(" ")[0]))
  check("dashboard shows roll prompt", dash.toLowerCase().includes("roll"))

  await team.goto(`${BASE}/admin`)
  await team.waitForURL("**/dashboard**", { timeout: 15000 })
  check("team blocked from /admin (redirected)", true)

  await team.goto(`${BASE}/dashboard/problem-statement`)
  await team.waitForSelector("text=THE ROLL")
  const psClosed = await team.locator("body").innerText()
  check("roll gate: closed shows waiting screen", psClosed.toLowerCase().includes("organizers") || psClosed.toLowerCase().includes("hang tight"))
  check("roll gate: no roll button when closed", (await team.locator('button:has-text("Roll")').count()) === 0)

  await adminLogin(admin)
  await admin.goto(`${BASE}/admin`)
  await admin.click('button:has-text("Open roll")')
  await admin.waitForSelector('button:has-text("Close roll")', { timeout: 30000 })
  check("admin: roll opened", true)

  await team.goto(`${BASE}/dashboard/problem-statement`)
  await team.waitForSelector('button:has-text("Roll")', { timeout: 30000 })
  await team.click('button:has-text("Roll")')
  await team.waitForSelector("text=LOCKED IN AT", { timeout: 60000 })
  const lockedText = await team.locator("body").innerText()
  check("team rolled + PS locked", lockedText.includes("LOCKED"))
  check("no re-roll message", lockedText.toLowerCase().includes("no re-roll"))
  const psCodeMatch = lockedText.match(/PS-0\d/)
  check("assigned a PS code", !!psCodeMatch, psCodeMatch?.[0] ?? "none")

  await team.reload()
  await team.waitForSelector("text=LOCKED IN AT", { timeout: 30000 })
  check("PS survives reload (permanent)", true)
  check("no roll button after locking", (await team.locator('button:has-text("Roll")').count()) === 0)

  await team.goto(`${BASE}/dashboard/submit/round1`)
  await team.waitForSelector('input[type="file"]')
  await team.setInputFiles('input[type="file"]', {
    name: "team-deck.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: Buffer.concat([Buffer.from("PK\u0003\u0004 small deck for prod test")]),
  })
  await team.click('button:has-text("Upload deck")')
  await team.waitForFunction(() => document.body.innerText.includes("Round 1 submission received"), { timeout: 60000 })
  check("round1: small deck uploaded", true)

  const size = 12 * 1024 * 1024
  await team.setInputFiles('input[type="file"]', {
    name: "big-deck-12mb.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer: Buffer.concat([Buffer.from("PK\u0003\u0004"), randomBytes(size - 4)]),
  })
  await team.click('button:has-text("Upload deck")')
  await team.waitForFunction(
    () =>
      document.body.innerText.includes("Round 1 submission received") ||
      document.body.innerText.includes("SYSTEM FAULT") ||
      document.body.innerText.includes("larger than"),
    { timeout: 180000 }
  )
  const bigText = await team.locator("body").innerText()
  check("round1: 12MB re-upload accepted (SYSTEM FAULT fixed on prod)", bigText.includes("Round 1 submission received") && !bigText.includes("SYSTEM FAULT"))
  check("round1: newest file wins", bigText.includes("big-deck-12mb.pptx"))

  await team.goto(`${BASE}/dashboard/submit/final`)
  await team.waitForSelector("text=FINAL", { timeout: 30000 })
  const finalClosed = await team.locator("body").innerText()
  check("final gate: closed blocks submissions", finalClosed.toLowerCase().includes("organizers") || finalClosed.toLowerCase().includes("closed") || finalClosed.toLowerCase().includes("waiting"))

  await admin.goto(`${BASE}/admin`)
  await admin.click('button:has-text("Open final")')
  await admin.waitForSelector('button:has-text("Close")', { timeout: 30000 })
  check("admin: final submissions opened", true)

  await team.goto(`${BASE}/dashboard/submit/final`)
  await team.waitForSelector('input[name="url"]', { timeout: 30000 })
  await team.fill('input[name="url"]', "https://github.com/test-team/epochesque-prod-test")
  await team.click('button:has-text("Submit repo")')
  await team.waitForFunction(() => document.body.innerText.includes("repo") || document.body.innerText.includes("received") || document.body.innerText.includes("GitHub"), { timeout: 60000 })
  const finalText = await team.locator("body").innerText()
  check("final: repo URL submitted", finalText.includes("github.com/test-team/epochesque-prod-test"))

  const failed = results.filter((r) => !r.ok)
  console.log(`\nPHASE B: ${results.length - failed.length}/${results.length} passed`)
  await browser.close()
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error("PHASE B CRASHED:", e)
  process.exit(1)
})
