const PPT_EXTS = [".ppt", ".pptx", ".pdf"]
const MAX_PPT_BYTES = 5 * 1024 * 1024

export function deckFileError(name: string, size: number): string | null {
  const lower = name.toLowerCase()
  if (!PPT_EXTS.some((ext) => lower.endsWith(ext))) {
    return "Only .ppt, .pptx or .pdf files are allowed."
  }
  if (size > MAX_PPT_BYTES) {
    return "File is larger than 5 MB."
  }
  return null
}

export function deckMagicError(name: string, buffer: Buffer): string | null {
  const head = buffer.subarray(0, 4)
  const lower = name.toLowerCase()
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
  const isZip = head[0] === 0x50 && head[1] === 0x4b && (head[2] === 0x03 || head[2] === 0x05)
  const isOle = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0

  if (lower.endsWith(".pdf") && !isPdf) return "This file's content is not a valid PDF."
  if (lower.endsWith(".pptx") && !isZip) return "This file's content is not a valid PPTX (zip) document."
  if (lower.endsWith(".ppt") && !isOle && !isZip) return "This file's content is not a valid PPT document."
  return null
}

export function imageFileError(name: string, size: number): string | null {
  const lower = name.toLowerCase()
  if (!/\.(jpe?g|png|webp)$/.test(lower)) return "Only .jpg, .png or .webp images are allowed."
  if (size > 5 * 1024 * 1024) return "Image is larger than 5 MB."
  return null
}

export function imageMagicError(name: string, buffer: Buffer): string | null {
  const head = buffer.subarray(0, 12)
  const lower = name.toLowerCase()
  const isJpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
  const isWebp = head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    if (!isJpg) return "This file's content is not a valid JPEG image."
  } else if (lower.endsWith(".png")) {
    if (!isPng) return "This file's content is not a valid PNG image."
  } else if (lower.endsWith(".webp")) {
    if (!isWebp) return "This file's content is not a valid WebP image."
  }
  return null
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80)
}
