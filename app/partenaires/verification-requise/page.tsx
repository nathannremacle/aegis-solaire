import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { ShieldAlert, Mail, ArrowRight, RefreshCw, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VerificationRequiseClient } from "./verification-requise-client"

export const metadata = {
  title: "Validation d'e-mail requise | Aegis Solaire",
  description: "Accès restreint : confirmation de votre adresse e-mail professionnelle requise pour débloquer la Marketplace.",
}

interface PageProps {
  searchParams?: Promise<{
    email?: string
    company?: string
  }>
}

export default async function VerificationRequisePage({ searchParams }: PageProps) {
  const resolved = searchParams ? await searchParams : {}
  const email = resolved.email || ""
  const company = resolved.company || ""

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="Aegis Solaire - Accueil">
            <div className="relative h-9 w-36 sm:h-10 sm:w-44 shrink">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-md border-border font-mono text-xs font-medium"
            >
              <Link href="/">Accueil</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xs flex flex-col gap-6">
            
            {/* Header Shield */}
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-2xs">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold mb-3 font-mono">
                <span>Accès Marketplace Verrouillé</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Validation d'e-mail requise
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md">
                Pour des raisons de conformité et de sécurité, l'accès à la Marketplace des chantiers photovoltaïques en Wallonie est réservé aux installateurs ayant validé leur e-mail.
              </p>
            </div>

            {/* Application Info Box */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Société
                </span>
                <span className="font-semibold text-sm text-foreground">
                  {company || "Votre entreprise"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Adresse e-mail
                </span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {email || "Non renseignée"}
                </span>
              </div>
            </div>

            {/* Stepper Progression */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                  ✓
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">01. Enregistrement de la candidature</p>
                  <p className="text-xs text-muted-foreground">Votre dossier est bien reçu sur la plateforme.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-xs font-bold animate-pulse">
                  !
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-amber-600">02. Confirmation de l'adresse e-mail (Action requise)</p>
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur le lien reçu dans votre boîte de réception pour déverrouiller vos accès.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-60">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground text-xs font-bold">
                  03
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">03. Contrôle RESCERT & BCE</p>
                  <p className="text-xs text-muted-foreground">Validation technique sous 24 à 48h.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-60">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground text-xs font-bold">
                  04
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">04. Accès Marketplace actif</p>
                  <p className="text-xs text-muted-foreground">Consultation et déblocage des demandes de devis.</p>
                </div>
              </div>
            </div>

            {/* Interactive Resend Client Component */}
            <VerificationRequiseClient email={email} />

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground">
        <p>Aegis Solaire · INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique</p>
      </footer>
    </div>
  )
}
