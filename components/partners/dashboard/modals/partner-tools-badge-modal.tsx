"use client"

import * as React from "react"
import Link from "next/link"
import { Award, Calculator, Check, Copy, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface PartnerToolsBadgeModalProps {
  partner: {
    company_name?: string | null
    rescert_slug?: string | null
  } | null
  onClose: () => void
}

function toSafeSlug(value: string | null | undefined): string {
  const cleaned = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return cleaned || "verified"
}

export default function PartnerToolsBadgeModal({
  partner,
  onClose,
}: PartnerToolsBadgeModalProps) {
  const [copied, setCopied] = React.useState(false)
  const badgeSlug = partner?.rescert_slug?.trim() || "verified"
  const profileSlug = badgeSlug !== "verified" ? badgeSlug : ""
  const targetHref = profileSlug
    ? `https://www.aegissolaire.com/partenaires/annuaire/${profileSlug}`
    : "https://www.aegissolaire.com/partenaires/annuaire"

  const embedSnippet = `<a href="${targetHref}" target="_blank" rel="noopener noreferrer"><img src="https://www.aegissolaire.com/api/badges/rescert/${encodeURIComponent(
    badgeSlug
  )}" alt="${
    partner?.company_name
      ? `${partner.company_name} — Installateur Certifié RESCERT Aegis Solaire`
      : "Installateur Certifié RESCERT Aegis Solaire"
  }" width="280" height="72" /></a>`

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet)
      setCopied(true)
      toast.success("Code HTML du badge copié !")
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Copie impossible automatiquement. Sélectionnez le bloc manuellement.")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-tools-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-xl max-h-[90dvh] overflow-hidden rounded-t-2xl sm:rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-accent">
              Boîte à outils partenaire RESCERT
            </span>
            <h2 id="partner-tools-modal-title" className="text-lg sm:text-xl font-bold text-foreground font-heading">
              Badge Vérifié &amp; Outils B2B
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Section 1 : Badge Officiel RESCERT */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-accent shrink-0" />
              <h3 className="text-sm font-bold text-foreground font-heading">
                Badge Officiel « Partenaire RESCERT Vérifié »
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Intégrez ce badge dynamique sur votre site web ou votre signature de devis pour rassurer vos clients finaux sur votre agrément officiel.
            </p>

            <div className="flex justify-center py-2">
              <img
                src={`/api/badges/rescert/${encodeURIComponent(badgeSlug)}`}
                alt="Aperçu du badge officiel Aegis Solaire"
                width={280}
                height={72}
                className="rounded-xl border border-border shadow-2xs"
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-3 font-mono text-[11px] text-muted-foreground break-all select-all">
              {embedSnippet}
            </div>

            <Button
              type="button"
              onClick={handleCopy}
              size="sm"
              className="w-full rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Code HTML copié !" : "Copier le code HTML à coller sur mon site"}</span>
            </Button>
          </div>

          {/* Section 2 : Calculateur DPI 40 % & Note CFO B2B */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-accent shrink-0" />
              <h3 className="text-sm font-bold text-foreground font-heading">
                Générateur de Note Financière DPI 40 % &amp; TRI B2B
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Éditez en <span className="font-mono tabular-nums">30</span> secondes un dossier financier PME/Industrie (DPI majorée{" "}
              <span className="font-mono tabular-nums">40 %</span>, économie ISoc, Easy&apos;Green, Certificats Verts CWaPE) exportable en PDF à votre nom d&apos;entreprise{" "}
              <strong className="text-foreground">
                ({partner?.company_name || toSafeSlug(partner?.company_name)})
              </strong>
              .
            </p>
            <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold gap-2">
              <Link href="/partenaires/outils/calculateur-dpi-b2b" onClick={onClose}>
                <span>Ouvrir le calculateur DPI 40 % (Marque Blanche)</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
