"use client"

import { useFormStatus } from "react-dom"
import { buttonClass } from "@/components/ui"

export function SubmitButton({
  children,
  pendingText = "Working…",
  variant = "primary",
  size = "md",
  className = "",
  confirm,
}: {
  children: React.ReactNode
  pendingText?: string
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
  className?: string
  confirm?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass(variant, size) + " " + className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
    >
      {pending ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}
