import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Epochesque — Roll. Build. Ship."
export const size = { width: 1200, height: 630 }

const LOGO_B64 = "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"

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
          <img
            src={`data:image/jpeg;base64,${LOGO_B64}`}
            width={96}
            height={96}
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
              border: "4px solid #c2703e",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, fontWeight: 700, color: "#fafaf9", letterSpacing: "-0.02em", lineHeight: 1 }}>EPOCHESQUE</div>
            <div style={{ fontSize: 34, color: "#c2703e", fontStyle: "italic", marginTop: 8 }}>roll. build. ship.</div>
          </div>
        </div>
        <div style={{ marginTop: 48, fontSize: 26, color: "#8a8a8a" }}>
          A 24-hour hackathon · you don&apos;t choose your problem, you roll it
        </div>
      </div>
    ),
    size
  )
}