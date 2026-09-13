import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Epochesque — Roll. Build. Ship."
export const size = { width: 1200, height: 630 }

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 75% 15%, rgba(194,112,62,0.22) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 20% 85%, rgba(139,92,246,0.10) 0%, transparent 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
              border: "4px solid #c2703e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              backgroundColor: "rgba(194,112,62,0.12)",
            }}
          >
            🎲
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, fontWeight: 700, color: "#fafaf9", letterSpacing: "-0.02em", lineHeight: 1 }}>EPOCHESQUE</div>
            <div style={{ fontSize: 34, color: "#c2703e", fontStyle: "italic", marginTop: 8 }}>roll. build. ship.</div>
          </div>
        </div>
        <div style={{ marginTop: 48, fontSize: 26, color: "#8a8a8a" }}>
          A 48-hour hackathon · you don&apos;t choose your problem, you roll it
        </div>
      </div>
    ),
    size
  )
}
