import { describe, it, expect } from "vitest"
import { parseScoresCsv } from "@/lib/csv"
import { deckFileError, deckMagicError, sanitizeFileName } from "@/lib/validate"

describe("parseScoresCsv", () => {
  it("parses headered CSV", () => {
    const res = parseScoresCsv("Team Code,Score,Notes\nT-01,87.5,great pitch\nT-02,90,\n")
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0]).toEqual({ team_code: "T-01", score: "87.5", notes: "great pitch" })
    expect(res.invalid).toHaveLength(0)
  })

  it("parses headerless CSV", () => {
    const res = parseScoresCsv("T-01,87.5\nT-02,90\n")
    expect(res.rows).toHaveLength(2)
  })

  it("rejects bad scores and missing codes", () => {
    const res = parseScoresCsv("T-01,abc\n,50\nT-02,-5\nT-03,99999\nT-04,72\n")
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].team_code).toBe("T-04")
    expect(res.invalid).toHaveLength(4)
    expect(res.invalid.map((v) => v.reason)).toEqual([
      "invalid score (must be 0–10000)",
      "missing team code",
      "invalid score (must be 0–10000)",
      "invalid score (must be 0–10000)",
    ])
  })

  it("handles CRLF and quoted notes", () => {
    const res = parseScoresCsv('team,score,notes\r\nT-01,50,"solid, clean"\r\n')
    expect(res.rows[0].notes).toBe("solid, clean")
  })
})

describe("deckFileError", () => {
  it("allows ppt/pptx/pdf under 5MB", () => {
    expect(deckFileError("deck.pptx", 1024)).toBeNull()
    expect(deckFileError("deck.PPT", 1024)).toBeNull()
    expect(deckFileError("deck.pdf", 5 * 1024 * 1024)).toBeNull()
  })

  it("rejects wrong extensions and oversize", () => {
    expect(deckFileError("virus.exe", 10)).toMatch(/Only/)
    expect(deckFileError("big.pptx", 5 * 1024 * 1024 + 1)).toMatch(/5 MB/)
  })
})

describe("deckMagicError", () => {
  it("accepts real magic bytes", () => {
    expect(deckMagicError("a.pdf", Buffer.from("%PDF-1.7 rest"))).toBeNull()
    expect(deckMagicError("a.pptx", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]))).toBeNull()
    expect(deckMagicError("a.ppt", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00, 0x00]))).toBeNull()
  })

  it("rejects fake extensions", () => {
    expect(deckMagicError("fake.pdf", Buffer.from("not a pdf at all"))).toMatch(/not a valid PDF/)
    expect(deckMagicError("fake.pptx", Buffer.from("plain text script"))).toMatch(/not a valid PPTX/)
    expect(deckMagicError("fake.ppt", Buffer.from("plain text script"))).toMatch(/not a valid PPT/)
  })
})

describe("sanitizeFileName", () => {
  it("strips dangerous characters", () => {
    expect(sanitizeFileName("..\\evil path/name (1).pptx")).not.toMatch(/[\\\/ ]/)
    expect(sanitizeFileName("deck.pptx")).toBe("deck.pptx")
  })
})
