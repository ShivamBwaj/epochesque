const sharp = require("sharp")
const fs = require("fs")

const SRC = "public/hackclub-logo.jpg"

async function main() {
  // Favicon (512x512 png) + apple touch icon (180x180)
  await sharp(SRC).resize(512, 512, { fit: "cover" }).png().toFile("src/app/icon.png")
  await sharp(SRC).resize(180, 180, { fit: "cover" }).png().toFile("src/app/apple-icon.png")

  // Small jpg for OG inline base64
  const buf = await sharp(SRC).resize(192, 192, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer()
  fs.writeFileSync("og-logo.b64", buf.toString("base64"))
  console.log("og base64 length:", buf.toString("base64").length)
}

main().then(() => console.log("done")).catch((e) => { console.error(e); process.exit(1) })
