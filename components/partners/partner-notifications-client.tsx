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
import type {
  PartnerNotificationMode,
  PartnerSegmentPreference,
} from "@/lib/partner-notification-prefs"

interface PartnerNotificationsClientProps {
  partnerId: string
  token: string
  companyName: string
  email: string
  initialMode: PartnerNotificationMode
  initialSegment: PartnerSegmentPreference
  autoAppliedMode: PartnerNotificationMode | null
}

const SEGMENT_OPTIONS: Array<{
  id: PartnerSegmentPreference
  title: string
  description: string
}> = [
  {
    id: "B2B",
    title: "B2B uniquement",
    description: "Entreprises, PME, hangars et grands comptes tertiaires (0 lead résidentiel B2C).",
  },
  {
    id: "B2C",
    title: "B2C uniquement",
    description: "Maisons unifamiliales et projets résidentiels uniquement.",
  },
  {
    id: "BOTH",
    title: "B2B & B2C",
    description: "Tous les projets qualifiés (résidentiels et tertiaires).",
  },
]

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
  initialSegment,
  autoAppliedMode,
}: PartnerNotificationsClientProps) {
  const [selectedMode, setSelectedMode] = React.useState<PartnerNotificationMode>(initialMode)
  const [savedMode, setSavedMode] = React.useState<PartnerNotificationMode>(initialMode)
  const [selectedSegment, setSelectedSegment] = React.useState<PartnerSegmentPreference>(initialSegment)
  const [savedSegment, setSavedSegment] = React.useState<PartnerSegmentPreference>(initialSegment)
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

  const handleSavePreferences = async (
    modeToSave: PartnerNotificationMode,
    segmentToSave: PartnerSegmentPreference
  ) => {
    setSelectedMode(modeToSave)
    setSelectedSegment(segmentToSave)
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
          segment: segmentToSave,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Impossible d'enregistrer vos préférences.")
      }

      setSavedMode(modeToSave)
      setSavedSegment(segmentToSave)
      const segText =
        segmentToSave === "B2B"
          ? "Segment : B2B uniquement (0 e-mail B2C)."
          : segmentToSave === "B2C"
            ? "Segment : B2C uniquement."
            : "Segment : B2B & B2C."

      if (modeToSave === "none") {
        setStatusMessage(`Confirmé : aucun e-mail automatique ne vous sera plus envoyé. (${segText})`)
      } else if (modeToSave === "new_only") {
        setStatusMessage(
          `Confirmé : les rappels et relances sont coupés. Seuls les nouveaux chantiers vous seront signalés. (${segText})`
        )
      } else {
        setStatusMessage(`Confirmé : toutes les alertes e-mail sont actives. (${segText})`)
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

      {/* Choix du segment (B2B / B2C / BOTH) */}
      <div className="flex flex-col gap-2.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Segments de chantiers reçus par e-mail
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SEGMENT_OPTIONS.map((seg) => {
            const isSelected = selectedSegment === seg.id
            const isSaved = savedSegment === seg.id
            return (
              <button
                key={seg.id}
                type="button"
                disabled={saving}
                onClick={() => handleSavePreferences(selectedMode, seg.id)}
                className={`w-full text-left rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                    : "border-border bg-card hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-foreground">{seg.title}</span>
                  <div
                    className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSaved
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    {isSaved && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{seg.description}</p>
              </button>
            )
          })}
        </div>
      </div>

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
              onClick={() => handleSavePreferences(option.id, selectedSegment)}
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

