import { describe, it, expect } from "vitest"
import { parseRegistrationCsv, genPassword } from "@/lib/csv"

const HEADERS = "Id,Name,Email,Ph_No,College,Payment Status,College Type,Team Id"

describe("parseRegistrationCsv", () => {
  it("groups members by Team Id and picks a valid leader by default", () => {
    const csv = [
      HEADERS,
      "24BCE1982,RAMYA RAMADOSS,ramya@x.edu,7200818746,VIT-CHENNAI,Unpaid,Internal,3637",
      "24BAI1596,RISHIKA CHERUKURI,rishika@x.edu,9042046930,VIT-CHENNAI,Paid,Internal,3637",
      "25BCE5617,AVNEESH LAHIRI,avneesh@x.edu,7977458216,VIT-CHENNAI,Unpaid,Internal,5817",
    ].join("\n")

    const res = parseRegistrationCsv(csv)
    expect(res.teams).toHaveLength(2)
    const t3637 = res.teams.find((t) => t.key === "3637")!
    expect(t3637.members).toHaveLength(2)
    expect(t3637.team_code).toBe("T-3637")
    expect(t3637.members[0].email).toBe("ramya@x.edu")
    expect(t3637.include).toBe(true)
    expect(res.skipped).toHaveLength(0)
  })

  it("skips rows with no Team Id or no name", () => {
    const csv = [
      HEADERS,
      ",NOBODY,nobody@x.edu,,,Unpaid,Internal,",
      "1,,ghost@x.edu,,,Unpaid,Internal,9999",
      "2,OK PERSON,ok@x.edu,,,Unpaid,Internal,8888",
    ].join("\n")

    const res = parseRegistrationCsv(csv)
    expect(res.teams).toHaveLength(1)
    expect(res.teams[0].key).toBe("8888")
    expect(res.skipped).toHaveLength(2)
  })

  it("flags teams with no valid email as excluded", () => {
    const csv = [HEADERS, "1,NO EMAIL PERSON,,,,Internal,,7000"].join("\n")
    const res = parseRegistrationCsv(csv)
    expect(res.teams).toHaveLength(1)
    expect(res.teams[0].include).toBe(false)
    expect(res.teams[0].issues[0]).toMatch(/valid email/)
  })

  it("flags duplicate emails across different teams", () => {
    const csv = [
      HEADERS,
      "1,AAA,same@x.edu,,,Unpaid,Internal,1111",
      "2,BBB,same@x.edu,,,Unpaid,Internal,2222",
    ].join("\n")
    const res = parseRegistrationCsv(csv)
    expect(res.teams.every((t) => !t.include)).toBe(true)
    expect(res.teams.every((t) => t.issues.some((i) => i.includes("same@x.edu")))).toBe(true)
  })

  it("handles quoted CSV fields with commas", () => {
    const csv = [HEADERS, '1,"LAST, FIRST",quoted@x.edu,,,"Paid, Internal",Internal,3333'].join("\n")
    const res = parseRegistrationCsv(csv)
    expect(res.teams[0].members[0].name).toBe("LAST, FIRST")
    expect(res.teams[0].members[0].payment_status).toBe("Paid, Internal")
    expect(res.teams[0].key).toBe("3333")
  })

  it("treats null/n-a cells as null and lowercases emails", () => {
    const csv = [HEADERS, "1,X Person,X@X.EDU,null,null,null,null,4444"].join("\n")
    const res = parseRegistrationCsv(csv)
    const m = res.teams[0].members[0]
    expect(m.email).toBe("x@x.edu")
    expect(m.phone).toBeNull()
    expect(m.college_type).toBeNull()
  })

  it("rejects files without required headers", () => {
    const res = parseRegistrationCsv("a,b,c\n1,2,3")
    expect(res.teams).toHaveLength(0)
    expect(res.skipped[0].reason).toMatch(/Missing required columns/)
  })

  it("handles CRLF line endings", () => {
    const csv = [HEADERS, "1,CRLF Person,crlf@x.edu,,,Unpaid,Internal,5555"].join("\r\n")
    const res = parseRegistrationCsv(csv)
    expect(res.teams).toHaveLength(1)
    expect(res.teams[0].members[0].email).toBe("crlf@x.edu")
  })
})

describe("helpers", () => {
  it("genPassword produces strong unique passwords", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const pw = genPassword()
      expect(pw).toMatch(/^Ep-[A-Za-z0-9]{14}!7$/)
      seen.add(pw)
    }
    expect(seen.size).toBeGreaterThan(190)
  })
})
