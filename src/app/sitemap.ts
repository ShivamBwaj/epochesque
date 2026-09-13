import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://epochesque.example.com"
  const now = new Date()
  return ["", "/speakers", "/oc", "/gallery", "/leaderboard", "/login"].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }))
}
