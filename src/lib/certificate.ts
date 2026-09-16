import "server-only"
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib"
import { createAdminClient } from "@/lib/supabase/admin"

// Measured directly off the template PNG (6000x3375): the blank underline
// for the name sits at y=2024-2032, spanning x=1464 to x=4535. The name
// is drawn just above it, centered in that same span.
const TEMPLATE_WIDTH = 6000
const TEMPLATE_HEIGHT = 3375
const NAME_LINE_Y_FROM_TOP = 2024
const NAME_LINE_X_START = 1464
const NAME_LINE_X_END = 4535
const NAME_FONT_SIZE = 130
const NAME_BASELINE_GAP = 40

let cachedTemplateBytes: Uint8Array | null = null

async function getTemplateBytes(): Promise<Uint8Array> {
  if (cachedTemplateBytes) return cachedTemplateBytes
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from("certificates").download("participation-template.png")
  if (error || !data) throw new Error("Could not load the certificate template.")
  cachedTemplateBytes = new Uint8Array(await data.arrayBuffer())
  return cachedTemplateBytes
}

function drawNameOnPage(page: import("pdf-lib").PDFPage, png: PDFImage, font: PDFFont, name: string) {
  page.drawImage(png, { x: 0, y: 0, width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT })

  const clean = name.trim().slice(0, 80) || "Participant"
  const textWidth = font.widthOfTextAtSize(clean, NAME_FONT_SIZE)
  const maxWidth = NAME_LINE_X_END - NAME_LINE_X_START
  const size = textWidth > maxWidth ? NAME_FONT_SIZE * (maxWidth / textWidth) : NAME_FONT_SIZE
  const centeredX = NAME_LINE_X_START + (maxWidth - font.widthOfTextAtSize(clean, size)) / 2

  // PDF y-axis is bottom-up; the template's line position was measured
  // top-down, so flip it, then nudge up by the baseline gap so the name
  // sits just above the line instead of on top of it.
  const yFromBottom = TEMPLATE_HEIGHT - NAME_LINE_Y_FROM_TOP + NAME_BASELINE_GAP

  page.drawText(clean, { x: centeredX, y: yFromBottom, size, font, color: rgb(0.1, 0.1, 0.15) })
}

export async function generateParticipationCertificate(name: string): Promise<Uint8Array> {
  const templateBytes = await getTemplateBytes()
  const pdf = await PDFDocument.create()
  const png = await pdf.embedPng(templateBytes)
  const font = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const page = pdf.addPage([TEMPLATE_WIDTH, TEMPLATE_HEIGHT])
  drawNameOnPage(page, png, font, name)
  return pdf.save()
}

// Batch path: embeds the (large) template image and font ONCE and reuses
// them across every page in a single PDFDocument — embedding per-person like
// generateParticipationCertificate does is fast for one person but far too
// slow at ~350 people (each embed re-decodes the 6000x3375 PNG).
export async function generateParticipationCertificatesBatch(
  names: string[]
): Promise<Uint8Array> {
  const templateBytes = await getTemplateBytes()
  const pdf = await PDFDocument.create()
  const png = await pdf.embedPng(templateBytes)
  const font = await pdf.embedFont(StandardFonts.TimesRomanBold)
  for (const name of names) {
    const page = pdf.addPage([TEMPLATE_WIDTH, TEMPLATE_HEIGHT])
    drawNameOnPage(page, png, font, name)
  }
  return pdf.save()
}
