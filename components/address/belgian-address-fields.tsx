"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MapPin, CheckCircle2, Loader2, Info, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  extractBelgianStreetAndNumber,
  isWalloonPostalCode,
} from "@/lib/leads-validation"

export interface LocalityOption {
  name: string
  city: string
  postalCode: string
  isPrimary: boolean
}

export interface StreetSuggestionItem {
  street: string
  houseNumber?: string | null
  postalCode: string
  city: string
  section: string
  streetIdent?: number
  label: string
  source: "SPW_ICAR" | "PHOTON_OSM"
}

export interface AddressVerificationSnapshot {
  validInWallonia: boolean
  resolutionLevel: "house" | "street" | "locality" | "none"
  streetVerified: boolean
  houseVerified: boolean
  hasHouseNumber: boolean
  postalMismatch: boolean
  officialCity?: string
  officialSection?: string
  officialPostalCode?: string
  canonicalStreet?: string
  houseNumber?: string | null
  googleMapsUrl?: string
  googleEarthUrl?: string
  streetViewUrl?: string
  walOnMapUrl?: string
}

// Cache client léger pour éviter de re-requêter les mêmes codes postaux pendant la session
const clientLocalitiesCache = new Map<string, LocalityOption[]>()

export interface BelgianLocalityFieldProps {
  id?: string
  postalCode: string
  value: string
  onChange: (city: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  showQuickChips?: boolean
  editorial?: boolean
}

export function BelgianLocalityField({
  id = "city",
  postalCode,
  value,
  onChange,
  placeholder = "ex. Namêche / Andenne",
  className,
  inputClassName,
  showQuickChips = true,
  editorial = false,
}: BelgianLocalityFieldProps) {
  const [fetched, setFetched] = useState<{ cp: string; items: LocalityOption[] }>({
    cp: "",
    items: [],
  })
  const [loadingCp, setLoadingCp] = useState<string | null>(null)
  const userEditedRef = useRef(false)
  const lastAutoFilledCpRef = useRef<string>("")
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    valueRef.current = value
    onChangeRef.current = onChange
  }, [value, onChange])

  const cleanCp = postalCode.replace(/\D/g, "").slice(0, 4)
  const isWalloonCp = cleanCp.length === 4 && isWalloonPostalCode(cleanCp)
  const localities = isWalloonCp && fetched.cp === cleanCp ? fetched.items : []
  const loading = isWalloonCp && loadingCp === cleanCp

  useEffect(() => {
    if (!isWalloonCp) return

    let cancelled = false

    const applyAutoFill = (items: LocalityOption[]) => {
      if (
        items.length > 0 &&
        (!valueRef.current.trim() ||
          (!userEditedRef.current && lastAutoFilledCpRef.current !== cleanCp))
      ) {
        const primary = items.find((l) => l.isPrimary) || items[0]
        lastAutoFilledCpRef.current = cleanCp
        onChangeRef.current(primary.name)
      }
    }

    const load = async () => {
      await Promise.resolve()
      if (cancelled) return

      const cached = clientLocalitiesCache.get(cleanCp)
      if (cached) {
        setFetched({ cp: cleanCp, items: cached })
        applyAutoFill(cached)
        return
      }

      setLoadingCp(cleanCp)
      try {
        const r = await fetch(
          `/api/address/suggest?action=localities&postalCode=${encodeURIComponent(cleanCp)}`
        )
        const data = r.ok ? await r.json() : null
        if (cancelled || !data || !Array.isArray(data.localities)) return
        const items: LocalityOption[] = data.localities
        clientLocalitiesCache.set(cleanCp, items)
        setFetched({ cp: cleanCp, items })
        applyAutoFill(items)
      } catch {
        // Non-bloquant si SPW temporairement inaccessible
      } finally {
        if (!cancelled) {
          setLoadingCp((curr) => (curr === cleanCp ? null : curr))
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [cleanCp, isWalloonCp])

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative">
        <Input
          id={id}
          autoComplete="address-level2"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            userEditedRef.current = true
            onChange(e.target.value)
          }}
          className={cn(
            editorial
              ? "h-[46px] rounded-[6px] text-[15px] bg-[var(--aegis-surface)] border-[var(--aegis-input-border)] text-[var(--aegis-ink)] placeholder:text-[var(--aegis-muted)]/85 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] focus-visible:ring-0 focus-visible:border-[var(--aegis-ink)] pr-8"
              : "h-12 rounded-lg text-base border-input bg-background/50 focus:bg-background pr-8",
            inputClassName
          )}
        />
        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {showQuickChips && localities.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {localities.slice(0, 6).map((loc) => {
            const active = value.trim().toLowerCase() === loc.name.toLowerCase()
            return (
              <button
                key={`${loc.postalCode}-${loc.name}`}
                type="button"
                onClick={() => {
                  userEditedRef.current = true
                  onChange(loc.name)
                }}
                className={cn(
                  editorial
                    ? "text-[11px] px-2.5 py-0.5 rounded-[5px] border transition-colors cursor-pointer"
                    : "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                  active
                    ? editorial
                      ? "bg-[var(--aegis-ink)] text-white border-[var(--aegis-ink)] font-semibold"
                      : "bg-primary text-primary-foreground border-primary font-semibold"
                    : editorial
                      ? "bg-[var(--aegis-surface-subtle)] text-[var(--aegis-muted)] border-[var(--aegis-border)] hover:bg-[var(--aegis-summary)] hover:text-[var(--aegis-ink)]"
                      : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                )}
              >
                {loc.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export interface BelgianStreetNumberFieldsProps {
  value: string
  onChange: (fullAddress: string) => void
  postalCode?: string | null
  city?: string | null
  onSuggestionSelect?: (suggestion: StreetSuggestionItem) => void
  streetId?: string
  houseId?: string
  streetPlaceholder?: string
  housePlaceholder?: string
  showError?: boolean
  required?: boolean
  requireHouseNumber?: boolean
  compact?: boolean
  className?: string
  inputHeightClass?: string
  editorial?: boolean
}

export function BelgianStreetNumberFields({
  value,
  onChange,
  postalCode,
  city,
  onSuggestionSelect,
  streetId = "address",
  houseId = "address-house-number",
  streetPlaceholder = "ex. Rue de la Station",
  housePlaceholder = "12",
  showError = false,
  required = true,
  requireHouseNumber = true,
  compact = false,
  className,
  inputHeightClass = "h-11",
  editorial = false,
}: BelgianStreetNumberFieldsProps) {
  const initialParsed = extractBelgianStreetAndNumber(value)
  const [streetInput, setStreetInput] = useState(initialParsed.street)
  const [houseInput, setHouseInput] = useState(
    [initialParsed.houseNumber, initialParsed.box ? `bte ${initialParsed.box}` : null]
      .filter(Boolean)
      .join(" ")
  )
  const [prevPropValue, setPrevPropValue] = useState(value.trim())
  const [emittedValue, setEmittedValue] = useState(value.trim())

  const [suggestState, setSuggestState] = useState<{
    query: string
    items: StreetSuggestionItem[]
  }>({ query: "", items: [] })
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(0)
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [verifyEntry, setVerifyEntry] = useState<{
    key: string
    result: AddressVerificationSnapshot | null
  }>({ key: "", result: null })

  const containerRef = useRef<HTMLDivElement>(null)
  const houseInputRef = useRef<HTMLInputElement>(null)
  const skipNextSuggestRef = useRef(false)

  // Synchroniser uniquement si la prop parent `value` change depuis l'extérieur
  const trimmedProp = (value || "").trim()
  if (trimmedProp !== prevPropValue) {
    setPrevPropValue(trimmedProp)
    if (trimmedProp !== emittedValue) {
      const parsed = extractBelgianStreetAndNumber(trimmedProp)
      setStreetInput(parsed.street)
      setHouseInput(
        [parsed.houseNumber, parsed.box ? `bte ${parsed.box}` : null]
          .filter(Boolean)
          .join(" ")
      )
      setEmittedValue(trimmedProp)
    }
  }

  const emitCombined = useCallback(
    (nextStreet: string, nextHouse: string) => {
      const combined = [nextStreet.trim(), nextHouse.trim()].filter(Boolean).join(" ")
      setEmittedValue(combined)
      onChange(combined)
    },
    [onChange]
  )

  // Fermer le menu si clic en dehors
  useEffect(() => {
    function handleDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleDocMouseDown)
    return () => document.removeEventListener("mousedown", handleDocMouseDown)
  }, [])

  const trimmedStreet = streetInput.trim()
  const suggestions =
    trimmedStreet.length >= 2 && suggestState.query === trimmedStreet ? suggestState.items : []

  // Autocomplétion live SPW ICAR / fallback dès 2 caractères
  useEffect(() => {
    if (skipNextSuggestRef.current) {
      skipNextSuggestRef.current = false
      return
    }

    if (trimmedStreet.length < 2) return

    const cleanCp = (postalCode ?? "").replace(/\D/g, "").slice(0, 4)
    let cancelled = false
    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true)
      try {
        const params = new URLSearchParams({
          action: "suggest",
          q: trimmedStreet,
        })
        if (cleanCp) params.set("postalCode", cleanCp)
        const res = await fetch(`/api/address/suggest?${params.toString()}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        const items: StreetSuggestionItem[] = Array.isArray(data?.suggestions)
          ? data.suggestions
          : []
        if (!cancelled) {
          setSuggestState({ query: trimmedStreet, items })
          setHighlightedIdx(0)
          setIsOpen(items.length > 0 && document.activeElement?.id === streetId)
        }
      } catch {
        // Silent
      } finally {
        if (!cancelled) setIsFetchingSuggestions(false)
      }
    }, 170)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmedStreet, postalCode, streetId])

  const cleanCp = (postalCode ?? "").replace(/\D/g, "").slice(0, 4)
  const trimmedHouse = houseInput.trim()
  const verifyKey =
    cleanCp.length === 4 && trimmedStreet.length >= 3 && trimmedHouse
      ? `${cleanCp}::${trimmedStreet}::${trimmedHouse}`
      : ""
  const activeVerifyResult =
    verifyKey && verifyEntry.key === verifyKey ? verifyEntry.result : null

  // Vérification SPW silencieuse en direct quand rue + numéro + CP sont renseignés
  useEffect(() => {
    if (!verifyKey) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          action: "verify",
          postalCode: cleanCp,
          street: trimmedStreet,
          house: trimmedHouse,
        })
        if (city) params.set("city", city)
        const res = await fetch(`/api/address/suggest?${params.toString()}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && data?.verification) {
          setVerifyEntry({ key: verifyKey, result: data.verification })
        }
      } catch {
        // Non-bloquant
      }
    }, 320)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [verifyKey, cleanCp, trimmedStreet, trimmedHouse, city])

  const selectSuggestion = (item: StreetSuggestionItem) => {
    skipNextSuggestRef.current = true
    const nextHouse = houseInput.trim() || item.houseNumber || ""
    setStreetInput(item.street)
    if (!houseInput.trim() && item.houseNumber) {
      setHouseInput(item.houseNumber)
    }
    setIsOpen(false)
    setSuggestState({ query: "", items: [] })
    emitCombined(item.street, nextHouse)
    onSuggestionSelect?.(item)

    if (!nextHouse) {
      setTimeout(() => {
        houseInputRef.current?.focus()
      }, 20)
    }
  }

  // Gère l'autofill navigateur ou un copier-coller d'adresse complète dans le champ Rue
  const handleStreetChange = (raw: string) => {
    setStreetInput(raw)
    emitCombined(raw, houseInput)
  }

  const handleStreetBlur = () => {
    setTimeout(() => setIsOpen(false), 120)
    if (!houseInput.trim() && streetInput.trim()) {
      const parsed = extractBelgianStreetAndNumber(streetInput)
      if (parsed.houseNumber && parsed.street.length >= 3) {
        const nextHouse = [
          parsed.houseNumber,
          parsed.box ? `bte ${parsed.box}` : null,
        ]
          .filter(Boolean)
          .join(" ")
        skipNextSuggestRef.current = true
        setStreetInput(parsed.street)
        setHouseInput(nextHouse)
        emitCombined(parsed.street, nextHouse)
      }
    }
  }

  const handleHouseChange = (raw: string) => {
    const cleaned = raw.slice(0, 24)
    setHouseInput(cleaned)
    emitCombined(streetInput, cleaned)
  }

  const hasValidStreet = streetInput.trim().length >= 3 && /[a-zA-ZÀ-ÿ]{2,}/.test(streetInput)
  const hasValidHouse =
    Boolean(houseInput.trim()) &&
    /^[1-9]\d{0,3}(?:\s*[-/]\s*(?:[1-9]\d{0,3}|[a-zA-Z]{1,3}))?(?:\s*[a-zA-Z]{1,3})?(?:\s*(?:bte|boite|boîte|bt|apt)\s*[a-zA-Z0-9]+)?$/i.test(
      houseInput.trim()
    )

  const streetHasError = showError && (required ? !hasValidStreet : Boolean(streetInput.trim()) && !hasValidStreet)
  const houseHasError =
    showError &&
    requireHouseNumber &&
    (required || Boolean(streetInput.trim())) &&
    !hasValidHouse

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-1.5 relative", className)}>
      <div className="grid grid-cols-[1fr_92px] sm:grid-cols-[1fr_108px] gap-2 items-start">
        {/* Champ Rue avec autocomplétion SPW ICAR */}
        <div className="relative">
          <Input
            id={streetId}
            autoComplete="address-line1"
            placeholder={streetPlaceholder}
            value={streetInput}
            onChange={(e) => handleStreetChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true)
            }}
            onBlur={handleStreetBlur}
            onKeyDown={(e) => {
              if (!isOpen || suggestions.length === 0) return
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setHighlightedIdx((prev) => (prev + 1) % suggestions.length)
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setHighlightedIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length)
              } else if (e.key === "Enter") {
                e.preventDefault()
                selectSuggestion(suggestions[highlightedIdx])
              } else if (e.key === "Escape") {
                setIsOpen(false)
              }
            }}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            className={cn(
              inputHeightClass,
              editorial
                ? "rounded-[6px] text-[14px] pr-7 bg-[var(--aegis-surface)] text-[var(--aegis-ink)] placeholder:text-[var(--aegis-muted)]/85 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] focus-visible:ring-0"
                : "rounded-lg text-sm pr-7",
              streetHasError
                ? editorial
                  ? "border-[var(--aegis-danger-text)] bg-[var(--aegis-danger-bg)]/40 focus-visible:border-[var(--aegis-danger-text)]"
                  : "border-destructive ring-1 ring-destructive"
                : editorial
                  ? "border-[var(--aegis-input-border)] focus-visible:border-[var(--aegis-ink)]"
                  : "border-input bg-background/50 focus:bg-background"
            )}
          />

          {isFetchingSuggestions && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}

          {isOpen && suggestions.length > 0 && (
            <div
              role="listbox"
              className={cn(
                "absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden max-h-60 overflow-y-auto",
                editorial
                  ? "rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] shadow-sm"
                  : "rounded-lg border border-border bg-card shadow-md"
              )}
            >
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.street}-${item.section}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={idx === highlightedIdx}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectSuggestion(item)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs flex items-start gap-2 last:border-b-0 transition-colors cursor-pointer",
                    editorial
                      ? "border-b border-[var(--aegis-divider)]"
                      : "border-b border-border/50",
                    idx === highlightedIdx
                      ? editorial
                        ? "bg-[var(--aegis-summary)] text-[var(--aegis-ink)]"
                        : "bg-primary/10 text-foreground"
                      : editorial
                        ? "hover:bg-[var(--aegis-surface-subtle)] text-[var(--aegis-ink)]"
                        : "hover:bg-secondary/70 text-foreground"
                  )}
                >
                  <MapPin
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 mt-0.5",
                      editorial ? "text-[var(--aegis-context)]" : "text-primary"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold truncate">{item.street}</span>
                    <span
                      className={cn(
                        "text-[11px] font-mono tabular-nums truncate",
                        editorial ? "text-[var(--aegis-muted)]" : "text-muted-foreground"
                      )}
                    >
                      {item.postalCode} {item.section || item.city}
                      {item.section &&
                      item.city &&
                      item.section.toLowerCase() !== item.city.toLowerCase()
                        ? ` (${item.city})`
                        : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Champ Numéro de maison dédié */}
        <div className="flex flex-col">
          <Input
            ref={houseInputRef}
            id={houseId}
            autoComplete="off"
            placeholder={`N° ${housePlaceholder}`}
            value={houseInput}
            onChange={(e) => handleHouseChange(e.target.value)}
            aria-label="Numéro de maison"
            className={cn(
              inputHeightClass,
              editorial
                ? "rounded-[6px] text-[14px] font-mono tabular-nums text-center bg-[var(--aegis-surface)] text-[var(--aegis-ink)] placeholder:text-[var(--aegis-muted)]/85 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] focus-visible:ring-0"
                : "rounded-lg text-sm font-mono tabular-nums text-center",
              houseHasError
                ? editorial
                  ? "border-[var(--aegis-danger-text)] bg-[var(--aegis-danger-bg)]/40 focus-visible:border-[var(--aegis-danger-text)]"
                  : "border-destructive ring-1 ring-destructive"
                : editorial
                  ? "border-[var(--aegis-input-border)] focus-visible:border-[var(--aegis-ink)]"
                  : "border-input bg-background/50 focus:bg-background"
            )}
          />
        </div>
      </div>

      {/* Feedback d'erreur ou de localisation SPW ICAR */}
      {(streetHasError || houseHasError) ? (
        <p
          role="alert"
          className={cn(
            "text-xs font-medium",
            editorial ? "text-[var(--aegis-danger-text)]" : "text-destructive"
          )}
        >
          {streetHasError
            ? "Saisissez le nom de votre rue ou avenue (min. 3 lettres)."
            : "Indiquez le numéro de maison (ex: 12 ou 12A) pour situer votre toiture."}
        </p>
      ) : activeVerifyResult?.postalMismatch ? (
        <p
          role="alert"
          className={cn(
            "text-[11px] font-medium flex items-center gap-1.5",
            editorial ? "text-[var(--aegis-danger-text)]" : "text-destructive"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Adresse incohérente avec le code postal{" "}
            <span className="font-mono tabular-nums">({postalCode || activeVerifyResult.officialPostalCode})</span>{" "}
            — vérifiez la rue et le code postal.
          </span>
        </p>
      ) : activeVerifyResult?.houseVerified ? (
        <p
          className={cn(
            "text-[11px] font-medium flex items-center gap-1.5",
            editorial ? "text-[var(--aegis-availability-text)]" : "text-primary"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>
            Adresse confirmée{" "}
            <span className="font-mono tabular-nums">
              ({activeVerifyResult.officialPostalCode}{" "}
              {activeVerifyResult.officialSection || activeVerifyResult.officialCity})
            </span>
          </span>
        </p>
      ) : activeVerifyResult?.streetVerified && !activeVerifyResult.houseVerified && !compact ? (
        <p
          className={cn(
            "text-[11px] flex items-center gap-1.5",
            editorial ? "text-[var(--aegis-muted)]" : "text-muted-foreground"
          )}
        >
          <Info
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              editorial ? "text-[var(--aegis-context)]" : "text-accent"
            )}
          />
          <span>
            Voirie reconnue sur{" "}
            <span className="font-mono tabular-nums">
              {activeVerifyResult.officialPostalCode} {activeVerifyResult.officialSection || activeVerifyResult.officialCity}
            </span>{" "}
            · vérifiez bien le n°.
          </span>
        </p>
      ) : null}
    </div>
  )
}
