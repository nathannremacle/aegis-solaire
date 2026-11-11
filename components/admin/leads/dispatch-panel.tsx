"use client"

import { useState, useEffect, useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  ShoppingCart,
  Users,
  Send,
  Mail,
  Check,
  RotateCcw,
  Loader2,
  Sparkles,
  MapPin,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export type CompatiblePartner = {
  id: string
  company_name: string
  email?: string
  credits: number
  segment?: string | null
  target_provinces?: string[] | null
  is_eligible?: boolean
  ineligibility_reason?: string
}

export function DispatchPanel({
  leadId,
  segment,
  province,
  creditCost,
  onCreditCostChange,
  partners = [],
  selectedPartnerIds,
  onSelectionChange,
  dispatchMode,
  onDispatchModeChange,
  existingPurchases = [],
}: {
  leadId?: string
  segment: "B2B" | "B2C" | string
  province?: string | null
  creditCost: number
  onCreditCostChange: (cost: number) => void
  partners: CompatiblePartner[]
  selectedPartnerIds: string[]
  onSelectionChange: (ids: string[]) => void
  dispatchMode: "marketplace" | "direct"
  onDispatchModeChange: (mode: "marketplace" | "direct") => void
  existingPurchases?: {
    id: string
    partner_id: string
    credits_spent?: number
    purchased_at?: string
    partners?: any
  }[]
}) {
  const maxSlots = segment === "B2B" ? 1 : 3
  const existingPartnerIds = new Set((existingPurchases || []).map((p) => p.partner_id))
  const remainingSlots = Math.max(0, maxSlots - existingPurchases.length)

  // Sélection manuelle des destinataires d'alerte e-mail (mode marketplace)
  const [selectedEmailPartnerIds, setSelectedEmailPartnerIds] = useState<string[]>([])
  const [sentHistory, setSentHistory] = useState<Record<string, { lastSentAt: string; count: number }>>({})
  const [isSendingEmails, setIsSendingEmails] = useState(false)
  const [sendingSinglePartnerId, setSendingSinglePartnerId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Charger l'historique des envois pour ce lead précis
  const loadHistory = async () => {
    if (!leadId) return
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/relance`, {
        headers: { "x-admin-request": "true" },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.sentHistoryByPartner) {
          setSentHistory(json.sentHistoryByPartner)
        }
      }
    } catch {
      // Non-bloquant
    }
  }

  useEffect(() => {
    loadHistory()
  }, [leadId])

  function matchesProvince(partnerProvinces?: string[] | null): boolean {
    if (!province) return true
    if (!partnerProvinces || partnerProvinces.length === 0) return true
    const cleanLead = province.toLowerCase().replace(/_/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return partnerProvinces.some((p) => {
      const cleanP = p.toLowerCase().replace(/_/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return cleanLead.includes(cleanP) || cleanP.includes(cleanLead)
    })
  }

  // Initialisation intelligente : pré-sélectionner les installateurs de la province qui n'ont pas encore reçu l'email
  useEffect(() => {
    if (partners.length > 0 && selectedEmailPartnerIds.length === 0) {
      const provincePartners = partners
        .filter((p) => matchesProvince(p.target_provinces))
        .map((p) => p.id)
      setSelectedEmailPartnerIds(provincePartners.length > 0 ? provincePartners : partners.map((p) => p.id))
    }
  }, [partners, province])

  function toggleDirectPartner(id: string) {
    if (existingPartnerIds.has(id)) return
    if (segment === "B2B") {
      onSelectionChange(selectedPartnerIds.includes(id) ? [] : [id])
    } else {
      if (selectedPartnerIds.includes(id)) {
        onSelectionChange(selectedPartnerIds.filter((p) => p !== id))
      } else {
        if (selectedPartnerIds.length < remainingSlots) {
          onSelectionChange([...selectedPartnerIds, id])
        }
      }
    }
  }

  function toggleEmailPartner(id: string) {
    if (selectedEmailPartnerIds.includes(id)) {
      setSelectedEmailPartnerIds(selectedEmailPartnerIds.filter((p) => p !== id))
    } else {
      setSelectedEmailPartnerIds([...selectedEmailPartnerIds, id])
    }
  }

  function selectAllEmailPartners() {
    setSelectedEmailPartnerIds(partners.map((p) => p.id))
  }

  function selectProvinceEmailPartners() {
    const provinceMatches = partners.filter((p) => matchesProvince(p.target_provinces)).map((p) => p.id)
    setSelectedEmailPartnerIds(provinceMatches.length > 0 ? provinceMatches : partners.map((p) => p.id))
  }

  function clearEmailPartners() {
    setSelectedEmailPartnerIds([])
  }

  // Envoi groupé à la sélection sans toucher aux vagues
  async function handleSendTeaserEmails() {
    if (!leadId) {
      toast.error("Identifiant du lead manquant")
      return
    }
    if (selectedEmailPartnerIds.length === 0) {
      toast.error("Veuillez sélectionner au moins un installateur destinataire.")
      return
    }

    setIsSendingEmails(true)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/leads/${leadId}/relance`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-request": "true" },
          body: JSON.stringify({
            partnerIds: selectedEmailPartnerIds,
            touchWave: false, // Ne modifie pas la vague du lead
            force: true,
          }),
        })

        const data = await res.json()
        if (!res.ok || data.error) {
          throw new Error(data.error || "Échec de l'envoi")
        }

        toast.success(
          `Lead envoyé avec succès par e-mail à ${data.sentCount} installateur(s) (sans toucher aux vagues) !`
        )
        await loadHistory()
      } catch (err: any) {
        toast.error(err.message || "Erreur lors de l'envoi des e-mails")
      } finally {
        setIsSendingEmails(false)
      }
    })
  }

  // Envoi individuel direct en 1 clic sans toucher aux vagues
  async function handleSendSinglePartner(partnerId: string, partnerName: string) {
    if (!leadId) return
    setSendingSinglePartnerId(partnerId)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/relance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-request": "true" },
        body: JSON.stringify({
          partnerIds: [partnerId],
          touchWave: false, // Ne modifie pas la vague du lead
          force: true,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || "Échec de l'envoi")
      }

      toast.success(`E-mail envoyé avec succès à ${partnerName} (vague inchangée) !`)
      await loadHistory()
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de l'e-mail")
    } finally {
      setSendingSinglePartnerId(null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-4 shadow-2xs">
      {/* 1. Sélecteur de Mode de Distribution */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-primary" />
            Diffusion &amp; Routage Installateurs
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-muted-foreground">Places :</span>
            <span className="font-bold tabular-nums text-foreground">
              {maxSlots} max ({segment === "B2B" ? "Exclusif" : "Concurrent"})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onDispatchModeChange("marketplace")}
            className={cn(
              "flex flex-col text-left p-3 rounded-lg border text-xs transition-all cursor-pointer",
              dispatchMode === "marketplace"
                ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20 text-foreground"
                : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-bold text-foreground">Alerte E-mail Marketplace</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1">
              Choisir qui reçoit ce lead par e-mail
            </span>
          </button>

          <button
            type="button"
            onClick={() => onDispatchModeChange("direct")}
            className={cn(
              "flex flex-col text-left p-3 rounded-lg border text-xs transition-all cursor-pointer",
              dispatchMode === "direct"
                ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20 text-foreground"
                : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-accent" />
              <span className="font-bold text-foreground">Attribution Directe</span>
            </div>
            <span className="text-[11px] text-muted-foreground mt-1">
              Débloquer et débiter les crédits
            </span>
          </button>
        </div>
      </div>

      {/* Réservations déjà effectives */}
      {existingPurchases.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Lead déjà attribué ({existingPurchases.length}/{maxSlots})
            </span>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {remainingSlots > 0
                ? `${remainingSlots} place${remainingSlots > 1 ? "s" : ""} restante${remainingSlots > 1 ? "s" : ""}`
                : "Complet (sold out)"}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {existingPurchases.map((pur, idx) => {
              const partnerObj = Array.isArray(pur.partners) ? pur.partners[0] : pur.partners
              const partnerName = partnerObj?.company_name || "Installateur partenaire"
              const dateStr = pur.purchased_at
                ? new Date(pur.purchased_at).toLocaleDateString("fr-BE", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""

              return (
                <div
                  key={pur.id || idx}
                  className="flex items-center justify-between text-[11px] bg-card border border-border/80 rounded-md px-2.5 py-1.5"
                >
                  <span className="font-semibold text-foreground">
                    Place {idx + 1} : {partnerName}
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground font-mono">
                    {pur.credits_spent !== undefined && (
                      <span className="text-primary font-bold">{pur.credits_spent} cr.</span>
                    )}
                    {dateStr && <span>{dateStr}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Coût d'acquisition officiel */}
      <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
        <div>
          <Label className="text-muted-foreground block font-medium">Coût du dossier</Label>
          <span className="text-[10px] text-muted-foreground font-mono">
            Barème V2 · {segment === "B2B" ? "B2B exclusif" : "B2C résidentiel"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-bold text-foreground border border-border tabular-nums">
            {segment === "B2B" ? 9 : 3} cr.
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            ({segment === "B2B" ? "88,50" : "29,50"} € HT)
          </span>
        </div>
      </div>

      {/* 2. Liste de Sélection des Installateurs */}
      <div className="border-t border-border pt-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
              {dispatchMode === "marketplace" ? "Destinataires de l'e-mail teaser" : "Installateurs à assigner"}
            </span>
            {province && (
              <span className="text-[10px] font-mono text-muted-foreground">
                ({province.replace("_", " ")})
              </span>
            )}
          </div>

          {dispatchMode === "marketplace" ? (
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={selectAllEmailPartners}
                className="px-2 py-0.5 rounded bg-secondary hover:bg-muted text-foreground font-medium transition-colors cursor-pointer"
                title="Sélectionner tous les installateurs"
              >
                Tous ({partners.length})
              </button>
              <button
                type="button"
                onClick={selectProvinceEmailPartners}
                className="px-2 py-0.5 rounded bg-secondary hover:bg-muted text-foreground font-medium transition-colors cursor-pointer"
                title="Sélectionner uniquement la province"
              >
                Province
              </button>
              <button
                type="button"
                onClick={clearEmailPartners}
                className="px-2 py-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                title="Tout désélectionner"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums font-semibold">
              {selectedPartnerIds.length} / {remainingSlots} sélectionné{selectedPartnerIds.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {partners.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-3 text-center bg-secondary/20 rounded-lg border border-dashed border-border">
            Aucun installateur partenaire enregistré dans la base.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
            {partners.map((partner) => {
              const isAlreadyAssigned = existingPartnerIds.has(partner.id)
              const isEligibleDirect = !isAlreadyAssigned && (partner.is_eligible ?? true) && partner.credits >= creditCost

              const isEmailChecked = selectedEmailPartnerIds.includes(partner.id)
              const isDirectChecked = selectedPartnerIds.includes(partner.id)

              const sentInfo = sentHistory[partner.id]
              const hasBeenNotified = Boolean(sentInfo)

              const isMatchLeadProvince = matchesProvince(partner.target_provinces)

              return (
                <div
                  key={partner.id}
                  onClick={() => {
                    if (dispatchMode === "marketplace") {
                      toggleEmailPartner(partner.id)
                    } else if (isEligibleDirect) {
                      toggleDirectPartner(partner.id)
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all cursor-pointer",
                    dispatchMode === "marketplace" && isEmailChecked && "bg-primary/5 border-primary shadow-2xs",
                    dispatchMode === "marketplace" && !isEmailChecked && "bg-card border-border hover:bg-secondary/40",
                    dispatchMode === "direct" && isAlreadyAssigned && "opacity-75 bg-secondary/50 border-border cursor-default",
                    dispatchMode === "direct" && !isAlreadyAssigned && !isEligibleDirect && "opacity-50 bg-secondary/20 border-border cursor-not-allowed",
                    dispatchMode === "direct" && isEligibleDirect && isDirectChecked && "bg-primary/5 border-primary",
                    dispatchMode === "direct" && isEligibleDirect && !isDirectChecked && "bg-card border-border hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Checkbox
                      checked={
                        dispatchMode === "marketplace"
                          ? isEmailChecked
                          : isAlreadyAssigned || isDirectChecked
                      }
                      disabled={
                        dispatchMode === "direct" &&
                        (isAlreadyAssigned ||
                          !isEligibleDirect ||
                          (!isDirectChecked && selectedPartnerIds.length >= remainingSlots))
                      }
                      onCheckedChange={() => {
                        if (dispatchMode === "marketplace") {
                          toggleEmailPartner(partner.id)
                        } else {
                          toggleDirectPartner(partner.id)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-foreground truncate">
                          {partner.company_name}
                        </span>

                        {isAlreadyAssigned && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                            Déjà attribué
                          </Badge>
                        )}

                        {isMatchLeadProvince && (
                          <span className="text-[9px] font-mono px-1.5 py-0 rounded bg-primary/10 text-primary font-semibold flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            Secteur
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        {partner.email && <span className="truncate">{partner.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums font-bold text-foreground">
                        {partner.credits} cr.
                      </span>

                      {/* Bouton d'envoi individuel rapide (1 clic, sans toucher aux vagues) */}
                      {dispatchMode === "marketplace" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSendSinglePartner(partner.id, partner.company_name)
                          }}
                          disabled={isSendingEmails || sendingSinglePartnerId === partner.id}
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-semibold bg-secondary hover:bg-primary hover:text-primary-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
                          title={`Envoyer directement ce dossier à ${partner.company_name} (sans toucher aux vagues)`}
                        >
                          {sendingSinglePartnerId === partner.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-2.5 w-2.5" />
                          )}
                          <span>{sendingSinglePartnerId === partner.id ? "Envoi..." : "Envoyer"}</span>
                        </button>
                      )}
                    </div>

                    {/* Statut d'envoi de mail pour ce lead */}
                    {hasBeenNotified ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded"
                        title={`E-mail envoyé le ${new Date(sentInfo.lastSentAt).toLocaleString("fr-BE")}`}
                      >
                        <Check className="h-2.5 w-2.5" />
                        <span>Notifié ({sentInfo.count}x)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground/70">
                        Non notifié
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bouton d'action d'envoi e-mail (en mode Marketplace) */}
        {dispatchMode === "marketplace" && (
          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleSendTeaserEmails}
              disabled={isSendingEmails || selectedEmailPartnerIds.length === 0}
              className="w-full h-9 gap-2 text-xs font-bold shadow-xs cursor-pointer"
            >
              {isSendingEmails ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>
                Envoyer le lead par e-mail à {selectedEmailPartnerIds.length} installateur
                {selectedEmailPartnerIds.length > 1 ? "s" : ""}
              </span>
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground text-center font-mono">
              <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
              <span>Envoi indépendant : n&apos;impacte pas le cycle des vagues automatiques (vague actuelle conservée).</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
