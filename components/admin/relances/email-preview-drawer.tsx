"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  X,
  Mail,
  Send,
  Eye,
  FileText,
  Smartphone,
  Monitor,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Building2,
  ShieldCheck,
  Coins,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface EmailPreviewDrawerProps {
  isOpen: boolean
  onClose: () => void
  leadId: string | null
  partnerId?: string | null
  waveNumber?: number
  defaultSubject?: string
  recipientEmail?: string
  recipientCompany?: string
  onTriggerNow?: (leadId: string, wave: number) => Promise<void>
  isTriggering?: boolean
  isSentItem?: boolean
}

export function EmailPreviewDrawer({
  isOpen,
  onClose,
  leadId,
  partnerId,
  waveNumber = 1,
  defaultSubject,
  recipientEmail,
  recipientCompany,
  onTriggerNow,
  isTriggering,
  isSentItem = false,
}: EmailPreviewDrawerProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile" | "text">("desktop")
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<{
    subject: string
    html: string
    text: string
  } | null>(null)

  useEffect(() => {
    if (!isOpen || !leadId) return

    async function fetchPreview() {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/relances", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-request": "1",
          },
          body: JSON.stringify({
            action: "preview_email",
            leadId,
            partnerId,
            waveNumber,
          }),
        })
        const json = await res.json()
        if (json.success && json.preview) {
          setPreviewData(json.preview)
        } else {
          toast.error(json.error || "Impossible de générer l'aperçu du mail.")
        }
      } catch (err: any) {
        toast.error("Erreur de communication avec le serveur d'aperçu.")
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [isOpen, leadId, partnerId, waveNumber])

  if (!isOpen) return null

  const subject = previewData?.subject || defaultSubject || "Aperçu de la relance"

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div
        className="w-full max-w-3xl h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  id="preview-title"
                  className="font-heading text-sm sm:text-base font-bold text-foreground truncate"
                >
                  Aperçu E-mail Teaser Swiss Editorial
                </span>
                <Badge variant="outline" className="font-mono text-[10px] tabular-nums">
                  Vague {waveNumber}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate font-mono">
                Destinataire : {recipientCompany || "Installateur"} ({recipientEmail || "Email"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fermer</span>
            </Button>
          </div>
        </div>

        {/* Controls Toolbar: Mode Switcher & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-border bg-secondary/20">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("desktop")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors font-medium cursor-pointer",
                viewMode === "desktop"
                  ? "bg-secondary text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Bureau</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("mobile")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors font-medium cursor-pointer",
                viewMode === "mobile"
                  ? "bg-secondary text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("text")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors font-medium cursor-pointer",
                viewMode === "text"
                  ? "bg-secondary text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Texte Brut</span>
            </button>
          </div>

          {!isSentItem && onTriggerNow && leadId && (
            <Button
              size="sm"
              disabled={isTriggering || loading}
              onClick={() => onTriggerNow(leadId, waveNumber)}
              className="h-8 text-xs gap-1.5 shadow-2xs font-semibold"
            >
              {isTriggering ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Déclencher l'envoi maintenant</span>
            </Button>
          )}
        </div>

        {/* Subject & Meta Pill */}
        <div className="px-5 py-3 border-b border-border bg-background/50 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase">
              Objet :
            </span>
            <span className="font-medium text-foreground">{subject}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-mono">
            <span>De : noreply@aegissolaire.com</span>
            <span>Répondre à : contact@aegissolaire.com</span>
            <span>Garantie : Concurrence plafonnée (Max 3 / Exclusif B2B)</span>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-muted/40 p-4 sm:p-6 overflow-y-auto flex justify-center items-start">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Génération de l'aperçu du teaser...</span>
            </div>
          ) : !previewData ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground text-xs bg-card border border-border rounded-xl max-w-md text-center">
              <span className="text-sm font-semibold text-foreground">Aperçu indisponible</span>
              <p className="text-xs text-muted-foreground">
                Impossible de charger le contenu de l'e-mail pour ce dossier. Vérifiez que le lead existe et est valide.
              </p>
            </div>
          ) : viewMode === "text" ? (
            <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-5 shadow-sm">
              <pre className="font-mono text-xs whitespace-pre-wrap text-foreground leading-relaxed selection:bg-primary selection:text-primary-foreground">
                {previewData.text || "Aucun contenu texte disponible."}
              </pre>
            </div>
          ) : (
            <div
              className={cn(
                "transition-all duration-200 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col",
                viewMode === "mobile" ? "w-[390px] min-h-[640px]" : "w-full max-w-[640px] min-h-[700px]"
              )}
            >
              {/* Fake Browser/Webmail Top bar */}
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="ml-2 font-mono text-[10px] text-slate-500 truncate">
                  Boîte de réception · {recipientEmail || "partenaire@artisan.be"}
                </span>
              </div>

              {/* Rendered HTML in iframe for pure isolated CSS */}
              <iframe
                title="Rendu de l'e-mail"
                srcDoc={previewData.html}
                className="w-full flex-1 border-0 min-h-[640px]"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
