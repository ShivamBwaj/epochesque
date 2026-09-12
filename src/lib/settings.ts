import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { EventTiming } from "@/lib/database.types"

export const getEventTiming = cache(async (): Promise<EventTiming> => {
  const supabase = await createClient()
  const { data } = await supabase.from("event_settings").select("key, value")
  const map = new Map((data ?? []).map((r) => [r.key, r.value]))
  const get = (k: string) => {
    const v = map.get(k)
    return typeof v === "string" && v ? v : null
  }
  return {
    event_start: get("event_start"),
    ps_release_at: get("ps_release_at"),
    round1_deadline: get("round1_deadline"),
    final_deadline: get("final_deadline"),
    event_end: get("event_end"),
  }
})

export function deadlinePassed(deadline: string | null, now = new Date()): boolean {
  if (!deadline) return false
  return now.getTime() > new Date(deadline).getTime()
}
