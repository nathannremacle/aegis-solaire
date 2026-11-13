"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
  MailCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PartnerNotificationMode } from "@/lib/partner-notification-prefs"

interface PartnerNotificationsClientProps {
  partnerId: string
  token: string
  companyName: string
  email: string
  initialMode: PartnerNotificationMode
  autoAppliedMode: PartnerNotificationMode | null
}

const MODE_OPTIONS: Array<{
  id: PartnerNotificationMode
  title: string
  badge: string
  description: string
  recommended?: boolean
}> = [
  {
    id: "new_only",
    title: "Nouveaux chantiers uniquement (0 relance)",
    badge: "Recommandé · Zéro rappel",
    recommended: true,
    description:
      "Vous recevez uniquement 1 e-mail lors de la qualification d'un nouveau chantier dans votre secteur. Aucun rappel de places restantes ni relance automatique.",
  },
  {
    id: "all",
    title: "Toutes les alertes (Nouveaux chantiers + rappels)",
    badge: "Flux complet",
    description:
      "Vous recevez les nouveaux chantiers ainsi que les rappels lorsqu'un dossier correspond à vos critères et qu'il reste peu de créneaux.",
  },
  {
    id: "none",
    title: "Mettre en pause tous les e-mails (0 e-mail)",
    badge: "Silence complet",
    description:
      "Aucun e-mail de prospection ou de relance ne vous sera envoyé. Vous conservez votre accès complet à la marketplace sur votre portail.",
  },
]

export function PartnerNotificationsClient({
  partnerId,
  token,
  companyName,
  email,
  initialMode,
  autoAppliedMode,
}: PartnerNotificationsClientProps) {
  const [selectedMode, setSelectedMode] = React.useState<PartnerNotificationMode>(initialMode)
  const [savedMode, setSavedMode] = React.useState<PartnerNotificationMode>(initialMode)
  const [saving, setSaving] = React.useState(false)
  const [statusMessage, setStatusMessage] = React.useState<string | null>(() => {
    if (autoAppliedMode === "none") {
      return "Toutes vos alertes e-mail ont bien été désactivées en 1 clic."
    }
    if (autoAppliedMode === "new_only") {
      return "Les relances e-mail ont bien été coupées. Vous ne recevrez plus que les nouveaux chantiers."
    }
    if (autoAppliedMode === "all") {
      return "Toutes vos alertes e-mail ont été réactivées."
    }
    return null
  })
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleSaveMode = async (modeToSave: PartnerNotificationMode) => {
    setSelectedMode(modeToSave)
    setSaving(true)
    setErrorMessage(null)

    try {
      const res = await fetch("/api/partners/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          token,
          mode: modeToSave,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Impossible d'enregistrer vos préférences.")
      }

      setSavedMode(modeToSave)
      if (modeToSave === "none") {
        setStatusMessage("Confirmé : aucun e-mail automatique ne vous sera plus envoyé.")
      } else if (modeToSave === "new_only") {
        setStatusMessage(
          "Confirmé : les rappels et relances sont coupés. Seuls les nouveaux chantiers vous seront signalés."
        )
      } else {
        setStatusMessage("Confirmé : toutes les alertes e-mail sont actives.")
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Carte identité partenaire */}
      <div className="rounded-xl border border-border bg-secondary/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Compte installateur partenaire
          </span>
          <span className="text-sm font-bold text-foreground truncate">{companyName}</span>
          <span className="font-mono text-xs text-muted-foreground truncate">{email}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-mono font-semibold text-foreground shrink-0 w-fit">
          {savedMode === "none" ? (
            <>
              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span>E-mails en pause</span>
            </>
          ) : savedMode === "new_only" ? (
            <>
              <MailCheck className="h-3.5 w-3.5 text-accent" />
              <span>Nouveaux uniquement</span>
            </>
          ) : (
            <>
              <Bell className="h-3.5 w-3.5 text-primary" />
              <span>Alertes complètes</span>
            </>
          )}
        </div>
      </div>

      {/* Bannière de confirmation ou d'erreur */}
      {statusMessage && (
        <div
          role="status"
          className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-start gap-3 text-sm text-foreground"
        >
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">{statusMessage}</span>
            <span className="text-xs text-muted-foreground">
              Ce réglage est effectif immédiatement et modifiable à tout moment depuis cette page ou votre espace partenaire.
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-medium"
        >
          {errorMessage}
        </div>
      )}

      {/* Choix des 3 fréquences */}
      <div className="flex flex-col gap-3">
        {MODE_OPTIONS.map((option) => {
          const isSelected = selectedMode === option.id
          const isSaved = savedMode === option.id
          return (
            <button
              key={option.id}
              type="button"
              disabled={saving}
              onClick={() => handleSaveMode(option.id)}
              className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex items-start justify-between gap-4 ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                  : "border-border bg-card hover:bg-secondary/40"
              }`}
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-foreground">
                    {option.title}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      option.recommended
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {option.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {option.description}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2 pt-0.5">
                {saving && isSelected ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      isSaved
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    {isSaved && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Pied d'action vers le portail */}
      <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            Support partenaires :{" "}
            <a href="mailto:contact@aegissolaire.com" className="underline font-medium text-foreground">
              contact@aegissolaire.com
            </a>
          </span>
        </div>

        <Button asChild size="sm" className="rounded-xl text-xs font-semibold gap-1.5 w-fit">
          <Link href="/partenaires/dashboard?alerts=1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Affiner mes provinces &amp; kWc sur le portail</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}

