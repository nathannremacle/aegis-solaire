"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Loader2,
  Zap,
  ArrowRight,
  Phone,
  Mail,
  Lock,
  AlertCircle,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"

interface ExpressLeadProps {
  lead: {
    id: string
    segment: string
    city: string
    postalCode: string
    provinceLabel: string
    maskedLastName: string
    surfaceType: string
    surfaceArea: number
    roofMaterial: string
    annualBill: number
    estimatedPowerKwc: number
    estimatedContractMin: number
    estimatedContractMax: number
    estimatedMargin: number
    contactPreference: string
    allocationMode: string
    marketplaceStatus: string
    maxSlots: number
    takenSlots: number
    remainingSlots: number
    images: Array<{ url: string; isAiProjection?: boolean }>
    credits: number
    directPriceHtva: number
    exclusiveCredits: number
    exclusivePriceHtva: number
  }
  partner: {
    id: string | null
    companyName: string
    vat: string | null
    credits: number
    distanceKm: number | null
  }
  token: string
  isPaymentReturn: boolean
  isUpgraded?: boolean
  initialPurchaseId: string | null
}

export function ExpressLeadCheckoutClient({
  lead,
  partner,
  token,
  isPaymentReturn,
  isUpgraded = false,
  initialPurchaseId,
}: ExpressLeadProps) {
  const [cgvAccepted, setCgvAccepted] = useState(true)
  const [enableOneClick, setEnableOneClick] = useState(true)
  const [exclusive, setExclusive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [unlockedData, setUnlockedData] = useState<{
    purchaseId: string
    creditsSpent: number
    lead: any
  } | null>(null)

  const images = Array.isArray(lead.images) ? lead.images : []
  const safeImageIdx = images.length > 0 ? Math.min(activeImageIdx, images.length - 1) : 0
  const activeImage = images[safeImageIdx] ?? null

  useEffect(() => {
    if (!isLightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false)
      } else if (e.key === "ArrowLeft" && images.length > 1) {
        setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length)
      } else if (e.key === "ArrowRight" && images.length > 1) {
        setActiveImageIdx((prev) => (prev + 1) % images.length)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isLightboxOpen, images.length])

  const canBuyExclusive = lead.takenSlots === 0 && lead.maxSlots > 1

  const selectedPriceHtva = exclusive ? lead.exclusivePriceHtva : lead.directPriceHtva
  const selectedCredits = exclusive ? lead.exclusiveCredits : lead.credits
  const selectedPriceTtc = Number((selectedPriceHtva * 1.21).toFixed(2))
  const hasEnoughCredits = partner.credits >= selectedCredits

  useEffect(() => {
    if (!isPaymentReturn && !initialPurchaseId) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `/api/partners/express/status?leadId=${encodeURIComponent(lead.id)}&t=${encodeURIComponent(token)}${partner.id ? `&pid=${encodeURIComponent(partner.id)}` : ""}`
        )
        const data = await res.json()
        if (active && data?.unlocked && data?.lead) {
          setUnlockedData({
            purchaseId: data.purchase.id,
            creditsSpent: data.purchase.credits_spent,
            lead: data.lead,
          })
          return
        }
        if (active && isPaymentReturn && attempts < 3) {
          attempts++
          timer = setTimeout(checkStatus, 2000)
        }
      } catch {
        if (active && isPaymentReturn && attempts < 3) {
          attempts++
          timer = setTimeout(checkStatus, 2000)
        }
      }
    }
    checkStatus()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [isPaymentReturn, initialPurchaseId, lead.id, token, partner.id])

  const handleCheckout = async (useCreditsIfAvailable: boolean) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/partners/express/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          token,
          exclusive,
          enableOneClick,
          useCreditsIfAvailable,
          cgvAccepted,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du paiement.")
      }
      if (data.paidByCredits || data.alreadyPurchased) {
        const stRes = await fetch(
          `/api/partners/express/status?leadId=${encodeURIComponent(lead.id)}&t=${encodeURIComponent(token)}&pid=${encodeURIComponent(data.partnerId || partner.id || "")}`
        )
        const stData = await stRes.json()
        if (stData?.unlocked) {
          setUnlockedData({
            purchaseId: stData.purchase.id,
            creditsSpent: stData.purchase.credits_spent,
            lead: stData.lead,
          })
          return
        }
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err: any) {
      setError(err?.message || "Erreur inattendue.")
    } finally {
      setLoading(false)
    }
  }

  const handleTremplinUpgrade = async () => {
    if (!unlockedData?.purchaseId) return
    setUpgrading(true)
    setError(null)
    try {
      const returnUrl = `/partenaires/express/${encodeURIComponent(lead.id)}?t=${encodeURIComponent(token)}&payment=return&upgraded=1${partner.id ? `&pid=${encodeURIComponent(partner.id)}` : ""}`
      const res = await fetch("/api/partners/credits/upgrade-from-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: unlockedData.purchaseId,
          packId: "pack_24",
          returnUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Impossible d'activer l'offre Tremplin.")
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err: any) {
      setError(err?.message || "Erreur upgrade Tremplin.")
    } finally {
      setUpgrading(false)
    }
  }

  const isClosed =
    !unlockedData && (lead.marketplaceStatus !== "available" || lead.remainingSlots <= 0)

  return (
    <main className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Aegis Solaire · Accès Express RESCERT
            </p>
            <p className="text-sm font-bold text-foreground">{partner.companyName}</p>
          </div>
          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-mono tabular-nums font-semibold text-foreground border border-border">
            #{lead.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {unlockedData ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Dossier débloqué avec succès</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">
                {unlockedData.lead.first_name} {unlockedData.lead.last_name}
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                <a
                  href={`tel:${unlockedData.lead.phone}`}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 font-mono tabular-nums font-semibold text-foreground"
                >
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span>{unlockedData.lead.phone}</span>
                </a>
                <a
                  href={`mailto:${unlockedData.lead.email}`}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-foreground truncate"
                >
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{unlockedData.lead.email}</span>
                </a>
              </div>
              {unlockedData.lead.site_address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {unlockedData.lead.site_address}, {unlockedData.lead.postal_code} {unlockedData.lead.city}
                  </span>
                </p>
              )}
              <Link
                href="/partenaires/dashboard"
                className="text-xs font-semibold text-primary underline underline-offset-4"
              >
                Ouvrir mon CRM Partenaire →
              </Link>
            </div>

            {isUpgraded && (
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-xs text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <strong>Quota Accélération activé !</strong> Vos crédits supplémentaires ont été ajoutés avec la Garantie Livraison <span className="font-mono tabular-nums">45</span> jours.
                </span>
              </div>
            )}

            {!isUpgraded && unlockedData.creditsSpent < 24 && (
              <div className="rounded-2xl border-2 border-accent bg-accent/5 p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>Offre Tremplin 15 min · Zéro perte sur votre achat</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  Déduisez intégralement cet achat d&apos;un Quota Accélération (<span className="font-mono tabular-nums">24</span> crédits à <span className="font-mono tabular-nums">-16 %</span>)
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ne payez que la différence nette et recevez immédiatement{" "}
                  <strong className="font-mono tabular-nums text-foreground">
                    +{24 - unlockedData.creditsSpent} crédits
                  </strong>{" "}
                  supplémentaires (valables 12 mois, avec Garantie Livraison 45 jours).
                </p>
                <Button
                  onClick={handleTremplinUpgrade}
                  disabled={upgrading}
                  className="w-full rounded-xl py-5 text-sm font-bold cursor-pointer"
                >
                  {upgrading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Convertir en Quota 24 crédits (déduction appliquée)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground border border-border">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {lead.segment} ·{" "}
                <span className="font-mono tabular-nums">
                  {lead.remainingSlots}/{lead.maxSlots}
                </span>{" "}
                créneau(x) libre(s)
              </span>
              {partner.distanceKm !== null && (
                <span className="text-xs font-mono tabular-nums font-semibold text-primary">
                  À ~{partner.distanceKm.toFixed(1).replace(".", ",")} km de votre siège
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl font-bold text-foreground">
                Projet{" "}
                <span className="font-mono tabular-nums">{lead.estimatedPowerKwc} kWc</span> —{" "}
                {lead.city} ({lead.postalCode})
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Contact vérifié : <span className="font-mono">{lead.maskedLastName}</span> ·{" "}
                {lead.contactPreference === "written_first"
                  ? "Préférence : Écrit d'abord"
                  : "Appel direct autorisé"}
              </p>
            </div>

            {activeImage && (
              <div className="flex flex-col gap-2">
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted group">
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label="Agrandir la photo du bâtiment"
                  >
                    <img
                      src={activeImage.url}
                      alt={`Aperçu toiture ${safeImageIdx + 1}`}
                      className="w-full h-56 sm:h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-foreground/80 text-background px-2.5 py-1.5 text-xs font-semibold backdrop-blur-xs cursor-pointer hover:bg-foreground"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                    <span>Zoomer</span>
                  </button>

                  {images.length > 1 && (
                    <>
                      <span className="absolute top-2.5 right-2.5 rounded-md bg-foreground/75 text-background px-2 py-0.5 text-[11px] font-mono tabular-nums font-semibold">
                        {safeImageIdx + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-foreground/75 text-background flex items-center justify-center hover:bg-foreground cursor-pointer"
                        aria-label="Photo précédente"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImageIdx((prev) => (prev + 1) % images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-foreground/75 text-background flex items-center justify-center hover:bg-foreground cursor-pointer"
                        aria-label="Photo suivante"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={img.url + idx}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 cursor-pointer transition-all ${
                          idx === safeImageIdx
                            ? "border-primary ring-1 ring-primary/30"
                            : "border-border opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img src={img.url} alt={`Miniature ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-secondary/50 border border-border p-3">
                <span className="text-[11px] text-muted-foreground block">Facture annuelle</span>
                <span className="text-sm font-mono tabular-nums font-bold text-foreground">
                  {lead.annualBill.toLocaleString("fr-BE")} € / an
                </span>
              </div>
              <div className="rounded-xl bg-secondary/50 border border-border p-3">
                <span className="text-[11px] text-muted-foreground block">Marge brute estimée</span>
                <span className="text-sm font-mono tabular-nums font-bold text-foreground">
                  ~{lead.estimatedMargin.toLocaleString("fr-BE")} € HTVA
                </span>
              </div>
              <div className="rounded-xl bg-secondary/50 border border-border p-3">
                <span className="text-[11px] text-muted-foreground block">Surface &amp; Toiture</span>
                <span className="text-xs font-semibold text-foreground">
                  <span className="font-mono tabular-nums">{lead.surfaceArea} m²</span> · {lead.roofMaterial}
                </span>
              </div>
              <div className="rounded-xl bg-secondary/50 border border-border p-3">
                <span className="text-[11px] text-muted-foreground block">Budget chantier</span>
                <span className="text-xs font-mono tabular-nums font-semibold text-foreground">
                  {lead.estimatedContractMin.toLocaleString("fr-BE")} –{" "}
                  {lead.estimatedContractMax.toLocaleString("fr-BE")} €
                </span>
              </div>
            </div>

            {canBuyExclusive && (
              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 p-3 cursor-pointer">
                <Checkbox
                  checked={exclusive}
                  onCheckedChange={(c) => setExclusive(c === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-foreground">
                  <strong>Verrouiller l&apos;Exclusivité Totale</strong> (100 % pour votre société,{" "}
                  <span className="font-mono tabular-nums">
                    {lead.exclusivePriceHtva.toFixed(2).replace(".", ",")} € HTVA
                  </span>
                  )
                </span>
              </label>
            )}

            {isClosed ? (
              <div className="rounded-xl border border-border bg-muted p-4 text-center text-sm text-muted-foreground">
                Tous les créneaux disponibles pour ce dossier viennent d&apos;être attribués.
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-2 border-t border-border">
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={cgvAccepted}
                    onCheckedChange={(c) => setCgvAccepted(c === true)}
                    className="mt-0.5"
                  />
                  <span>
                    J&apos;accepte les{" "}
                    <Link href="/cgv" target="_blank" className="underline text-foreground">
                      CGV B2B Aegis Solaire
                    </Link>{" "}
                    (facture pro TVA <span className="font-mono tabular-nums">21 %</span>{" "}
                    immédiate, Garantie Anti-Fake 7j).
                  </span>
                </label>

                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={enableOneClick}
                    onCheckedChange={(c) => setEnableOneClick(c === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Mémoriser mon moyen de paiement pour déblocage 1-clic (zéro abonnement).
                  </span>
                </label>

                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {hasEnoughCredits ? (
                  <Button
                    onClick={() => handleCheckout(true)}
                    disabled={loading || !cgvAccepted}
                    className="w-full rounded-xl py-6 text-sm font-bold cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Débloquer avec mes crédits ({selectedCredits} cr.) →
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleCheckout(false)}
                    disabled={loading || !cgvAccepted}
                    className="w-full rounded-xl py-6 text-sm font-bold cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Débloquer via Bancontact —{" "}
                    <span className="font-mono tabular-nums ml-1">
                      {selectedPriceHtva.toFixed(2).replace(".", ",")} € HTVA
                    </span>{" "}
                    <span className="text-xs opacity-80 ml-1 font-mono tabular-nums">
                      ({selectedPriceTtc.toFixed(2).replace(".", ",")} € TVAC)
                    </span>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isLightboxOpen && activeImage && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photo plein écran"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-card text-foreground flex items-center justify-center shadow-md cursor-pointer hover:bg-secondary"
            aria-label="Fermer le zoom"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative max-w-5xl max-h-[88dvh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.url}
              alt={`Photo plein écran ${safeImageIdx + 1}`}
              className="max-h-[85dvh] max-w-full w-auto rounded-xl object-contain shadow-2xl"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-2 sm:left-4 h-10 w-10 rounded-full bg-card/90 text-foreground flex items-center justify-center shadow-md hover:bg-card cursor-pointer"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIdx((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 sm:right-4 h-10 w-10 rounded-full bg-card/90 text-foreground flex items-center justify-center shadow-md hover:bg-card cursor-pointer"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card/90 text-foreground px-3 py-1 text-xs font-mono tabular-nums font-bold shadow-md">
                  {safeImageIdx + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
