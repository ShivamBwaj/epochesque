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

export interface EventFlags {
  rollOpen: boolean
  finalOpen: boolean
  gamingOpen: boolean
}

export const getEventFlags = cache(async (): Promise<EventFlags> => {
  const supabase = await createClient()
  const { data } = await supabase.from("event_settings").select("key, value").in("key", ["roll_open", "final_open", "gaming_open"])
  const map = new Map((data ?? []).map((r) => [r.key, r.value]))
  return {
    rollOpen: map.get("roll_open") === true,
    finalOpen: map.get("final_open") === true,
    gamingOpen: map.get("gaming_open") === true,
  }
})

export function deadlinePassed(deadline: string | null, now = new Date()): boolean {
  if (!deadline) return false
  return now.getTime() > new Date(deadline).getTime()
}

export function rollIsOpen(flags: EventFlags, timing: EventTiming): boolean {
  if (flags.rollOpen) return true
  if (timing.ps_release_at && deadlinePassed(timing.ps_release_at)) return true
  return false
}
