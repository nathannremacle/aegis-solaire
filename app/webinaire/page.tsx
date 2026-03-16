"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Calculator, CheckCircle2 } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { webinaireLeadSchema, type WebinaireLeadInput } from "@/lib/webinaire-schema"
import { toast } from "sonner"

const YOUTUBE_VIDEO_ID = "E4xAHyNo2lE"
const YOUTUBE_THUMB = `https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`

const FONCTION_OPTIONS = [
  { value: "DAF", label: "DAF" },
  { value: "RSE", label: "RSE" },
  { value: "Dirigeant", label: "Dirigeant" },
  { value: "Autre", label: "Autre" },
] as const

export default function WebinairePage() {
  const [isUnlocked, setIsUnlocked] = useState(false)

  const form = useForm<WebinaireLeadInput>({
    resolver: zodResolver(webinaireLeadSchema),
    defaultValues: { firstName: "", jobTitle: undefined, email: "" },
  })

  async function onSubmit(data: WebinaireLeadInput) {
    try {
      const res = await fetch("/api/leads/webinaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors de l'envoi.")
        return
      }
      toast.success(json.message ?? "Accès au replay débloqué.")
      setIsUnlocked(true)
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.")
    }
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <Header />
      <main className="min-w-0 flex-1">
        {/* Hero — compact et lisible */}
        <section className="relative overflow-hidden bg-primary py-10 sm:py-14 lg:py-16 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="absolute inset-0 -z-10">
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
          </div>
          <div className="mx-auto max-w-4xl min-w-0 px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70 sm:text-sm">
              Replay Masterclass
            </p>
            <h1 className="mt-2 text-balance text-2xl font-bold tracking-tight text-primary-foreground min-[480px]:text-3xl sm:text-4xl">
              Zéro CAPEX : financer 100% de votre solaire par le Tiers-Investissement
            </h1>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-primary-foreground/90 sm:text-base">
              Décryptage vidéo exclusif — bâtiment tertiaire et parkings sans investissement initial.
            </p>
          </div>
        </section>

        <section className="border-t border-border bg-background py-8 sm:py-12 lg:py-14 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            {!isUnlocked ? (
              /* ——— État verrouillé : layout clair formulaire + vignette vidéo ——— */
              <div className="grid gap-8 lg:grid-cols-[1fr,400px] lg:items-start lg:gap-12">
                {/* Bloc vidéo floutée (gauche sur desktop, en haut sur mobile pour donner envie) */}
                <div className="relative order-2 overflow-hidden rounded-2xl border border-border bg-muted shadow-xl lg:order-1">
                  <div className="relative aspect-video w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={YOUTUBE_THUMB}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-primary/70 backdrop-blur-[6px]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary-foreground/30 bg-primary/90 shadow-lg">
                        <Lock className="h-10 w-10 text-primary-foreground" />
                      </div>
                      <p className="max-w-sm text-center text-base font-semibold text-primary-foreground sm:text-lg">
                        Remplissez le formulaire pour débloquer le replay
                      </p>
                      <p className="text-center text-sm text-primary-foreground/80">
                        ~30 secondes • Email professionnel uniquement
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formulaire (droite sur desktop) */}
                <div className="order-1 lg:order-2 lg:sticky lg:top-24">
                  <Card className="border-2 border-primary/10 bg-card shadow-lg">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-xl">Accédez au replay gratuit</CardTitle>
                      <CardDescription>
                        Coordonnées professionnelles — pas de spam, accès immédiat.
                      </CardDescription>
                    </CardHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Prénom</Label>
                          <Input
                            id="firstName"
                            placeholder="Jean"
                            {...form.register("firstName")}
                            className={form.formState.errors.firstName ? "border-destructive" : ""}
                          />
                          {form.formState.errors.firstName && (
                            <p className="text-xs text-destructive">
                              {form.formState.errors.firstName.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jobTitle">Fonction</Label>
                          <Select
                            onValueChange={(v) => form.setValue("jobTitle", v as WebinaireLeadInput["jobTitle"])}
                            value={form.watch("jobTitle") ?? ""}
                          >
                            <SelectTrigger
                              id="jobTitle"
                              className={form.formState.errors.jobTitle ? "border-destructive" : ""}
                            >
                              <SelectValue placeholder="Sélectionnez votre fonction" />
                            </SelectTrigger>
                            <SelectContent>
                              {FONCTION_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.jobTitle && (
                            <p className="text-xs text-destructive">
                              {form.formState.errors.jobTitle.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email professionnel</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="jean.dupont@entreprise.fr"
                            {...form.register("email")}
                            className={form.formState.errors.email ? "border-destructive" : ""}
                          />
                          {form.formState.errors.email && (
                            <p className="text-xs text-destructive">
                              {form.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col gap-3 pt-2">
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                          disabled={form.formState.isSubmitting}
                        >
                          {form.formState.isSubmitting ? "Envoi…" : "Débloquer le replay"}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                          En soumettant, vous acceptez d’être recontacté dans le cadre de votre projet.{" "}
                          <Link href="/politique-confidentialite" className="underline hover:text-foreground">
                            Confidentialité
                          </Link>
                        </p>
                      </CardFooter>
                    </form>
                  </Card>
                </div>
              </div>
            ) : (
              /* ——— État débloqué : vidéo + CTA simulateur ——— */
              <div className="mx-auto max-w-4xl space-y-8">
                <div className="overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-lg">
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      className="absolute left-0 top-0 h-full w-full"
                      src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0`}
                      title="Replay Masterclass Zéro CAPEX – Aegis Solaire"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-primary/10 bg-muted/30 px-4 py-3 text-center">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Ressource experte sélectionnée par Aegis Solaire : l’exemple du modèle Sofiac.
                  </p>
                </div>

                {/* Résumé structuré de la masterclass */}
                <article className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm sm:px-8 sm:py-10">
                  <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Résumé de la Masterclass : Rénover ses bâtiments tertiaires sans investissement (Zéro CAPEX)
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Ce webinaire exclusif, animé par les experts de Sobre Énergie, Orange Business et la Sofiac, décrypte les méthodes pour mettre votre parc immobilier en conformité avec la loi sans mobiliser votre trésorerie.
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">Voici les 4 points clés à retenir :</p>

                  <ul className="mt-6 space-y-6 sm:mt-8">
                    <li className="relative flex gap-4 rounded-xl border border-border bg-muted/30 p-5 pl-14 sm:gap-5 sm:p-6 sm:pl-16">
                      <span className="absolute left-4 top-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:left-5 sm:top-6">
                        1
                      </span>
                      <div className="min-w-0 space-y-2">
                        <h3 className="font-semibold text-foreground">L’urgence réglementaire de 2025 (Décret Tertiaire & BACS)</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          L’année 2025 marque un tournant juridique. Outre l’obligation d’installer un système d’automatisation (GTB) pour les bâtiments de plus de 290 kW imposée par le décret BACS, la plateforme OPERAT va délivrer les premières attestations définitives liées au Décret Tertiaire.{" "}
                          <strong className="text-foreground">La non-conformité de vos bâtiments impactera désormais directement leur valeur financière</strong> en cas de revente ou de transaction.
                        </p>
                      </div>
                    </li>

                    <li className="relative flex gap-4 rounded-xl border border-border bg-muted/30 p-5 pl-14 sm:gap-5 sm:p-6 sm:pl-16">
                      <span className="absolute left-4 top-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:left-5 sm:top-6">
                        2
                      </span>
                      <div className="min-w-0 space-y-3">
                        <h3 className="font-semibold text-foreground">L’optimisation technique grâce à la GTB &quot;Light&quot; (IoT)</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          Pour réduire vos factures, Orange Business présente une solution de rupture : la Gestion Technique du Bâtiment par objets connectés (IoT). Contrairement aux systèmes traditionnels impliquant de lourds travaux de câblage, la GTB sans fil est non intrusive et centralisée dans le Cloud.
                        </p>
                        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                          <li><strong className="text-foreground">Le résultat :</strong> Une installation en moyenne jusqu’à 40 % moins chère, générant environ <strong className="text-foreground">20 % d’économies d’énergie</strong>.</li>
                          <li><strong className="text-foreground">Le rendement :</strong> Un ROI ultra-rapide estimé entre 3 et 5 ans, idéal pour les bâtiments jusqu’à 3 000 ou 5 000 m².</li>
                        </ul>
                      </div>
                    </li>

                    <li className="relative flex gap-4 rounded-xl border border-border bg-muted/30 p-5 pl-14 sm:gap-5 sm:p-6 sm:pl-16">
                      <span className="absolute left-4 top-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:left-5 sm:top-6">
                        3
                      </span>
                      <div className="min-w-0 space-y-3">
                        <h3 className="font-semibold text-foreground">Le levier financier : le Tiers-Investissement (Modèle Sofiac)</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          La Sofiac propose d’investir <strong className="text-foreground">100 % du coût de vos projets de rénovation</strong> (à partir d’un million d’euros) sur des durées allant jusqu’à 15 ans.
                        </p>
                        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                          <li><strong className="text-foreground">Aucune garantie exigée et zéro avance de trésorerie.</strong></li>
                          <li>Remboursement via un partage des économies d’énergie, encadré par un <strong className="text-foreground">Contrat de Performance Énergétique (CPE)</strong> certifié (ex. AFNOR).</li>
                          <li><strong className="text-foreground">Vous devenez propriétaire des équipements dès le premier jour</strong> des travaux.</li>
                          <li>Montage possible hors-bilan ou en dette fournisseur pour ne pas impacter votre capacité d’endettement.</li>
                        </ul>
                      </div>
                    </li>

                    <li className="relative flex gap-4 rounded-xl border border-border bg-muted/30 p-5 pl-14 sm:gap-5 sm:p-6 sm:pl-16">
                      <span className="absolute left-4 top-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground sm:left-5 sm:top-6">
                        4
                      </span>
                      <div className="min-w-0 space-y-3">
                        <h3 className="font-semibold text-foreground">Des preuves de rentabilité concrètes</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          La méthode du tiers-investissement a déjà fait ses preuves sur des projets combinant solaire, GTB, relamping et pompes à chaleur :
                        </p>
                        <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
                          <li><strong className="text-foreground">Un collège privé (47 000 m²) :</strong> 2 M€ de travaux financés par la Sofiac, <strong className="text-foreground">175 000 € d’économies de trésorerie annuelles</strong>, baisse de 34 % de la consommation sur 15 ans.</li>
                          <li><strong className="text-foreground">Un centre de recherche Biotech :</strong> 2,3 M€ investis sans avance, réduction de ~80 % de la consommation de gaz et 150 000 € d’économies par an.</li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </article>

                <Card className="overflow-hidden border-2 border-accent/20 bg-gradient-to-br from-card to-accent/5">
                  <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Calculator className="h-6 w-6 shrink-0 text-accent" />
                        Prêt à appliquer ce modèle à votre entreprise ?
                      </CardTitle>
                      <CardDescription className="text-base">
                        Calculez la rentabilité de vos toitures et parkings en 2 minutes.
                      </CardDescription>
                    </div>
                    <Button asChild size="lg" className="w-full shrink-0 bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">
                      <Link href="/#simulator">Lancer ma simulation</Link>
                    </Button>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
