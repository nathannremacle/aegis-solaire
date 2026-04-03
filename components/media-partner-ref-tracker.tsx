"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

const STORAGE_KEY = "mp_ref"

export function MediaPartnerRefTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref && ref.trim().length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, ref.trim())
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [searchParams])

  return null
}

export function getStoredMediaPartnerRef(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
