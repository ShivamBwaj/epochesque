import { NextResponse } from "next/server"
import { getViewer } from "@/lib/auth"
import { getEventFlags } from "@/lib/settings"
import { generateParticipationCertificate } from "@/lib/certificate"

export async function GET() {
  const viewer = await getViewer()
  if (!viewer || viewer.role === "admin" || !viewer.registration) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"))
  }

  const flags = await getEventFlags()
  if (!flags.certificatesPublished) {
    return new NextResponse("Certificates aren't available yet.", { status: 403 })
  }

  const bytes = await generateParticipationCertificate(viewer.registration.name)
  return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="epochesque-certificate-${viewer.registration.reg_no}.pdf"`,
    },
  })
}
