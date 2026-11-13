"use client"

import { useEffect, useRef, useCallback } from "react"

export type ClientPartnerTelemetryEventType =
  | "session_start"
  | "email_deep_link"
  | "lead_inspect_open"
  | "lead_inspect_duration"
  | "roof_photo_zoom"
  | "unlock_intent"
  | "credit_modal_open"
  | "marketplace_filter"
  | "crm_tab_open"

export interface TrackPartnerActivityPayload {
  eventType: ClientPartnerTelemetryEventType
  leadId?: string | null
  leadRef?: string | null
  durationMs?: number
  source?: string
  metadata?: Record<string, unknown>
  useBeacon?: boolean
}

const SESSION_STORAGE_KEY = "aegis_partner_telemetry_session_v1"

export function getPartnerSessionId(): string {
  if (typeof window === "undefined") return "ssr"
  try {
    let existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!existing) {
      existing =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, existing)
    }
    return existing
  } catch {
    return `sess_${Date.now()}`
  }
}

export function trackPartnerActivity(payload: TrackPartnerActivityPayload): void {
  if (typeof window === "undefined") return

  const body = JSON.stringify({
    sessionId: getPartnerSessionId(),
    eventType: payload.eventType,
    leadId: payload.leadId ?? null,
    leadRef: payload.leadRef ?? null,
    durationMs: payload.durationMs ?? 0,
    source: payload.source ?? "marketplace",
    metadata: payload.metadata ?? {},
  })

  if (payload.useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" })
      const sent = navigator.sendBeacon("/api/partners/telemetry", blob)
      if (sent) return
    } catch {
      // fallback to fetch
    }
  }

  fetch("/api/partners/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Télémétrie silencieuse : ne doit jamais perturber l'expérience installateur
  })
}

/**
 * Mesure le temps actif réel passé par un installateur à étudier un lead.
 * Met automatiquement le chronomètre en pause si l'onglet devient invisible
 * et transmet la durée cumulée lors de la fermeture ou du changement de page.
 */
export function useLeadInspectionTimer({
  lead,
  source,
  partnerCredits,
  enabled = true,
}: {
  lead: {
    id?: string
    segment?: string | null
    province?: string | null
    city?: string | null
    credit_cost?: number | null
    is_demo_preview?: boolean
  } | null
  source: string
  partnerCredits?: number
  enabled?: boolean
}) {
  const activeStartRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef<number>(0)
  const zoomedRoofRef = useRef<boolean>(false)
  const unlockIntentRef = useRef<boolean>(false)
  const flushedForLeadRef = useRef<string | null>(null)

  const leadId = lead?.id || null
  const isDemo = Boolean(lead?.is_demo_preview)

  const getCurrentActiveMs = useCallback(() => {
    let total = accumulatedMsRef.current
    if (activeStartRef.current !== null) {
      total += Math.max(0, Date.now() - activeStartRef.current)
    }
    return Math.min(1800000, Math.round(total))
  }, [])

  useEffect(() => {
    if (!enabled || !leadId || isDemo) return

    accumulatedMsRef.current = 0
    zoomedRoofRef.current = false
    unlockIntentRef.current = false
    flushedForLeadRef.current = null
    activeStartRef.current =
      typeof document !== "undefined" && document.visibilityState === "visible" ? Date.now() : null

    const baseMeta = {
      segment: lead?.segment ?? null,
      province: lead?.province ?? null,
      city: lead?.city ?? null,
      creditCost: lead?.credit_cost ?? null,
      partnerCredits: typeof partnerCredits === "number" ? partnerCredits : null,
    }

    trackPartnerActivity({
      eventType: "lead_inspect_open",
      leadId,
      leadRef: leadId.slice(0, 8),
      source,
      metadata: baseMeta,
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (activeStartRef.current !== null) {
          accumulatedMsRef.current += Math.max(0, Date.now() - activeStartRef.current)
          activeStartRef.current = null
        }
      } else {
        if (activeStartRef.current === null) {
          activeStartRef.current = Date.now()
        }
      }
    }

    const flushDuration = (useBeacon: boolean) => {
      if (flushedForLeadRef.current === leadId) return
      const durationMs = getCurrentActiveMs()
      flushedForLeadRef.current = leadId
      activeStartRef.current = null

      if (durationMs < 1000) return

      trackPartnerActivity({
        eventType: "lead_inspect_duration",
        leadId,
        leadRef: leadId.slice(0, 8),
        durationMs,
        source,
        useBeacon,
        metadata: {
          ...baseMeta,
          zoomedRoofPhoto: zoomedRoofRef.current,
          clickedUnlockIntent: unlockIntentRef.current,
        },
      })
    }

    const handlePageHide = () => flushDuration(true)

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
      flushDuration(false)
    }
  }, [enabled, leadId, isDemo, source, lead?.segment, lead?.province, lead?.city, lead?.credit_cost, partnerCredits, getCurrentActiveMs])

  const recordRoofZoom = useCallback(() => {
    if (!leadId || isDemo) return
    zoomedRoofRef.current = true
    trackPartnerActivity({
      eventType: "roof_photo_zoom",
      leadId,
      leadRef: leadId.slice(0, 8),
      durationMs: getCurrentActiveMs(),
      source,
      metadata: {
        segment: lead?.segment ?? null,
        province: lead?.province ?? null,
      },
    })
  }, [leadId, isDemo, source, lead?.segment, lead?.province, getCurrentActiveMs])

  const recordUnlockIntent = useCallback(
    (method: "credits" | "direct_pay" | "insufficient_credits") => {
      if (!leadId || isDemo) return
      unlockIntentRef.current = true
      trackPartnerActivity({
        eventType: "unlock_intent",
        leadId,
        leadRef: leadId.slice(0, 8),
        durationMs: getCurrentActiveMs(),
        source,
        metadata: {
          method,
          segment: lead?.segment ?? null,
          province: lead?.province ?? null,
          creditCost: lead?.credit_cost ?? null,
          partnerCredits: typeof partnerCredits === "number" ? partnerCredits : null,
        },
      })
    },
    [leadId, isDemo, source, lead?.segment, lead?.province, lead?.credit_cost, partnerCredits, getCurrentActiveMs]
  )

  return { recordRoofZoom, recordUnlockIntent }
}
