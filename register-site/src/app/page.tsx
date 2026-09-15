import Image from "next/image"
import { RegisterCard } from "@/components/register-card"

export default function HomePage() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div className="bg-glow" aria-hidden />
      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div className="card" style={{ padding: "32px 28px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 24 }}>
            <Image
              src="/hackclub-logo.jpg"
              alt="HackClub"
              width={48}
              height={48}
              style={{ borderRadius: 14, marginBottom: 14, boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }}
              priority
            />
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Epochesque</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
              The college registration portal is down — register here so your spot is confirmed for the event.
            </p>
          </div>
          <RegisterCard />
        </div>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 16, fontFamily: "monospace" }}>
          by HackClub
        </p>
      </div>
    </main>
  )
}
