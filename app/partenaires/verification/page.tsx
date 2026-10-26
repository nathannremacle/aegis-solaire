import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Clock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Validation de compte installateur | Aegis Solaire",
  description: "Confirmation de votre adresse email et état d'avancement de votre dossier installateur partenaire en Région wallonne.",
}

interface VerificationPageProps {
  searchParams?: Promise<{
    status?: string
    email?: string
    company?: string
    name?: string
  }>
}

export default async function PartnerVerificationPage({ searchParams }: VerificationPageProps) {
  const resolved = searchParams ? await searchParams : {}
  const status = resolved.status || "success"
  const email = resolved.email || ""
  const company = resolved.company || ""
  const name = resolved.name || ""

  const isSuccess = status === "success"

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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
              <Link href="/partenaires/login">Portail Installateur</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl">
          {isSuccess ? (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xs flex flex-col gap-6">
              {/* Badge & Icon Header */}
              <div className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-2xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-3">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Validation Sécurisée · Wallonie</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Adresse e-mail confirmée avec succès
                </h1>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md">
                  {name ? `Merci ${name} ! ` : "Merci ! "}
                  Votre adresse{" "}
                  {email ? (
                    <strong className="font-mono text-foreground">{email}</strong>
                  ) : (
                    "professionnelle"
                  )}{" "}
                  {company ? (
                    <>pour <strong>{company}</strong></>
                  ) : null}{" "}
                  est désormais authentifiée.
                </p>
              </div>

              {/* Stepper Progression Bento */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    État de votre demande
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Clock className="h-3 w-3" />
                    Audit technique en cours
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                      ✓
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">01. Enregistrement de la candidature</p>
                      <p className="text-xs text-muted-foreground">Dossier reçu et enregistré sur la plateforme.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                      ✓
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">02. Confirmation de l'adresse e-mail</p>
                      <p className="text-xs text-muted-foreground">Canal de contact direct et sécurisé validé.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                      03
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">03. Contrôle RESCERT & BCE (En cours)</p>
                      <p className="text-xs text-muted-foreground">
                        Vérification de votre agrément photovoltaïque et assurances sous <span className="font-mono tabular-nums font-semibold text-foreground">24 à 48 h</span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-60">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground text-xs font-bold">
                      04
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">04. Déblocage Marketplace des Leads</p>
                      <p className="text-xs text-muted-foreground">Notification par e-mail dès activation avec vos accès complets.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assistance & Contacts */}
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1 text-center sm:text-left">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                    Support Partenaires Wallonie
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    L'équipe Support Aegis Solaire
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" asChild className="rounded-lg text-xs font-mono">
                    <a href="mailto:contact@aegissolaire.com">
                      <Mail className="mr-1.5 h-3.5 w-3.5" />
                      contact@aegissolaire.com
                    </a>
                  </Button>
                </div>
              </div>

              {/* Bottom Return Button */}
              <div className="pt-2 flex justify-center">
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-2.5 font-medium shadow-xs">
                  <Link href="/">
                    Retour à l'accueil Aegis Solaire
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-destructive/30 bg-card p-6 sm:p-10 shadow-xs flex flex-col gap-6 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-2">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-foreground">
                  Lien de validation invalide ou expiré
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Le jeton de validation de votre adresse email est manquant, invalide ou a expiré.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                Si vous avez déjà validé votre email, votre dossier est actuellement en cours d'examen par notre équipe.
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href="/partenaires">Formulaire d'inscription</Link>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
                  <a href="mailto:contact@aegissolaire.com">Contacter le support</a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground">
        <p>Aegis Solaire · INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique</p>
      </footer>
    </div>
  )
}
