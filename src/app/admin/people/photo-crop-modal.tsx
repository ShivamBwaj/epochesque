"use client"

import { useCallback, useState } from "react"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"

export const PHOTO_ASPECT = 3 / 4

async function cropToWebp(imageSrc: string, crop: Area): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load image"))
    image.src = imageSrc
  })
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(crop.width))
  canvas.height = Math.max(1, Math.round(crop.height))
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unavailable")
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92))
  if (!blob) throw new Error("Could not export crop")
  return { blob, width: canvas.width, height: canvas.height }
}

export function PhotoCropModal({
  src,
  onCancel,
  onDone,
}: {
  src: string
  onCancel: () => void
  onDone: (file: File) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setArea(pixels)
  }, [])

  async function confirm() {
    if (!area || busy) return
    setBusy(true)
    setError(null)
    try {
      const { blob } = await cropToWebp(src, area)
      onDone(new File([blob], "photo-cropped.webp", { type: "image/webp" }))
    } catch {
      setError("Could not process the crop. Try a different image.")
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.10] bg-[#0d0d0e] p-5 shadow-2xl">
        <p className="hud-label mb-4">CROP PHOTO — LOCKED 4:5 CARD RATIO</p>
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black sm:h-80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={PHOTO_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="vertical-cover"
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted">ZOOM</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#c2703e]"
            aria-label="Zoom"
          />
        </div>
        {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-white/[0.10] px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !area}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "Processing…" : "Use this crop"}
          </button>
        </div>
      </div>
    </div>
  )
}
