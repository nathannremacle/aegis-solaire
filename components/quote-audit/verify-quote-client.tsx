"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Lock,
  ArrowRight,
} from "lucide-react"

export function VerifyQuoteClient() {
  const [file, setFile] = useState<File | null>(null)
  const [segment, setSegment] = useState<"B2C" | "B2B">("B2C")
  const [postalCode, setPostalCode] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [wantsCounterOffer, setWantsCounterOffer] = useState(true)
  const [faxNumber, setFaxNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError("Veuillez joindre votre devis (PDF ou photo smartphone).")
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("segment", segment)
      fd.append("postalCode", postalCode)
      fd.append("email", email)
      fd.append("phone", phone)
      fd.append("contactPreference", "written_first")
      fd.append("wantsCounterOffer", String(wantsCounterOffer))
      fd.append("fax_number", faxNumber)

      const res = await fetch("/api/quote-audits", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi.")
      }
      setSubmittedId(data.auditId)
    } catch (err: any) {
      setError(err?.message || "Impossible d'envoyer le devis.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background py-12 md:py-20 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-3 text-center">
          <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Cellule Technique Indépendante · Wallonie &amp; Bruxelles · <span className="font-mono tabular-nums">100 %</span> Gratuit
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Vous avez déjà reçu un devis solaire ? Vérifiez en{" "}
            <span className="font-mono tabular-nums">24 h</span> si le prix est vraiment de votre côté.
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            En Wallonie, nous constatons jusqu&apos;à{" "}
            <strong className="font-mono tabular-nums text-foreground">1 850 €</strong> d&apos;écart à puissance égale. Déposez votre devis : nos auditeurs contrôlent gratuitement votre tarif au kWc, le matériel Tier-1 et la conformité RGIE.
          </p>
        </div>

        {submittedId ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 sm:p-8 text-center flex flex-col gap-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">
              Devis reçu — Contrôle en cours par la Cellule Technique
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Référence d&apos;audit <span className="font-mono tabular-nums font-semibold text-foreground">#{submittedId.slice(0, 8).toUpperCase()}</span>. Vous recevrez votre diagnostic comparatif par écrit sous{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">24 h</span> ouvrées.
            </p>
            <Link
              href="/devis-panneaux-solaires"
              className="mt-2 inline-flex items-center justify-center text-xs font-semibold text-primary underline underline-offset-4"
            >
              Retour au simulateur Aegis Solaire →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs flex flex-col gap-5"
          >
            <input
              type="text"
              name="fax_number"
              value={faxNumber}
              onChange={(e) => setFaxNumber(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-foreground">
                1. Déposez votre devis reçu (PDF, JPG, PNG — confidentiel)
              </Label>
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6 cursor-pointer hover:bg-secondary/50 transition-colors">
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {file ? file.name : "Cliquez pour sélectionner votre devis PDF ou photo"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Document strictement confidentiel, jamais transmis aux concurrents
                </span>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="postalCode" className="text-xs font-semibold text-foreground">
                  2. Code postal du bâtiment
                </Label>
                <Input
                  id="postalCode"
                  placeholder="Ex : 4120"
                  maxLength={4}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-foreground">Segment du projet</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSegment("B2C")}
                    className={`rounded-lg border py-2 text-xs font-semibold cursor-pointer ${
                      segment === "B2C"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setSegment("B2B")}
                    className={`rounded-lg border py-2 text-xs font-semibold cursor-pointer ${
                      segment === "B2B"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Entreprise / PME
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  3. E-mail (réception du diagnostic écrit)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="prenom.nom@exemple.be"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
                  Téléphone mobile (vérification anti-robot)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0470 12 34 56"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="font-mono tabular-nums"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/30 p-3.5 cursor-pointer">
              <Checkbox
                checked={wantsCounterOffer}
                onCheckedChange={(c) => setWantsCounterOffer(c === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Si mon devis est surcoté :</strong> mettre gratuitement{" "}
                <span className="font-mono tabular-nums font-semibold text-foreground">2</span> installateurs certifiés RESCERT de ma province au défi de proposer mieux sur cahier des charges Tier-1 strict (écrit d&apos;abord, zéro centre d&apos;appels).
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-xl py-6 text-sm font-bold cursor-pointer">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Lancer le contrôle gratuit de mon devis (Résultat 24h)
            </Button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Service 100 % gratuit · Aucun engagement · Zéro revente à des tiers</span>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
