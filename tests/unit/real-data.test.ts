import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { parseRegistrationCsv } from "@/lib/csv"

const csvPath = path.resolve(__dirname, "../fixtures/real-registration.csv")

describe("real registration export", () => {
  it("groups the actual Event_Details export correctly", () => {
    const text = readFileSync(csvPath, "utf8")
    const res = parseRegistrationCsv(text)

    expect(res.totalRows).toBe(31)
    expect(res.teams).toHaveLength(22)

    const byCode = Object.fromEntries(res.teams.map((t) => [t.key, t]))

    expect(byCode["3637"].members).toHaveLength(1)
    expect(byCode["3637"].members[0].email).toBe("ramya.ramadoss2024@vitstudent.ac.in")

    expect(byCode["19012"].members).toHaveLength(4)
    const leader = byCode["19012"].members[byCode["19012"].leaderIndex]
    expect(leader.email_valid).toBe(true)

    expect(res.teams.every((t) => t.members.some((m) => m.email_valid))).toBe(true)
    expect(res.teams.every((t) => t.include)).toBe(true)
    expect(res.teams.every((t) => t.team_code.startsWith("T-"))).toBe(true)

    const dataSkips = res.skipped.filter((s) => s.row <= 34)
    expect(dataSkips).toHaveLength(2)
    expect(dataSkips.every((s) => s.reason === "No Team Id")).toBe(true)
  })
})
