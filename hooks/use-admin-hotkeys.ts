"use client"

import { useEffect, useRef } from "react"

export type HotkeyHandler = (e: KeyboardEvent) => void

export type HotkeyMap = Record<string, HotkeyHandler>

/**
 * Hook de gestion des raccourcis clavier pour le dashboard d'administration.
 * Ignore automatiquement les frappes si le focus se trouve dans un champ de saisie (input, textarea, select).
 */
export function useAdminHotkeys(hotkeys: HotkeyMap, enabled = true) {
  const hotkeysRef = useRef(hotkeys)

  useEffect(() => {
    hotkeysRef.current = hotkeys
  }, [hotkeys])

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tagName = target?.tagName
      const isEditable = target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT"

      // Ne pas intercepter les raccourcis à touche unique si l'admin tape du texte
      if (isEditable && !e.metaKey && !e.ctrlKey) {
        if (e.key === "Escape") {
          target?.blur()
        }
        return
      }

      // Gestion des combinaisons de modificateurs
      const parts: string[] = []
      if (e.metaKey || e.ctrlKey) parts.push("cmd")
      if (e.shiftKey) parts.push("shift")
      if (e.altKey) parts.push("alt")
      parts.push(e.key.toLowerCase())
      const combo = parts.join("+")

      const singleKey = e.key.toLowerCase()

      const handler = hotkeysRef.current[combo] || hotkeysRef.current[singleKey]
      if (handler) {
        handler(e)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled])
}
