"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Play } from "lucide-react"
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
        {/* Hero */}
        <section className="relative overflow-x-hidden bg-primary py-12 sm:py-16 lg:py-20 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="absolute inset-0 -z-10">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
          </div>
          <div className="mx-auto max-w-4xl min-w-0 px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-balance text-xl font-bold tracking-tight text-primary-foreground min-[480px]:text-2xl sm:text-3xl lg:text-4xl">
              Masterclass : Rénover son bâtiment tertiaire et ses parkings sans investissement (Zéro CAPEX).
            </h1>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-primary-foreground/90 sm:text-base lg:text-lg">
              Découvrez comment financer 100% de vos installations photovoltaïques grâce au Tiers-Investissement. Accédez au décryptage vidéo exclusif.
            </p>
          </div>
        </section>

        {/* Contenu : formulaire + zone vidéo (floutée ou réelle) */}
        <section className="border-t border-border bg-background py-10 sm:py-14 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-4xl min-w-0 px-4 sm:px-6 lg:px-8">
            {!isUnlocked ? (
              <>
                {/* Formulaire de capture */}
                <Card className="mx-auto max-w-md border-primary/20 bg-card shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Accédez au replay gratuit</CardTitle>
                    <CardDescription>
                      Renseignez vos coordonnées professionnelles pour débloquer la vidéo.
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
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting ? "Envoi…" : "Accéder au replay gratuit"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>

                {/* Placeholder vidéo flouté + cadenas */}
                <div className="relative mx-auto mt-10 max-w-4xl overflow-hidden rounded-xl border border-border bg-muted/50">
                  <div
                    className="relative aspect-video w-full backdrop-blur-md"
                    style={{ background: "linear-gradient(135deg, var(--muted) 0%, var(--muted) 100%)" }}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-primary/20 backdrop-blur-md">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/80 text-primary-foreground">
                        <Lock className="h-8 w-8" />
                      </div>
                      <p className="text-center text-sm font-medium text-foreground sm:text-base">
                        Débloquez la vidéo en remplissant le formulaire ci-dessus.
                      </p>
                    </div>
                    {/* Faux lecteur (forme play) */}
                    <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/40 bg-black/30">
                      <Play className="h-10 w-10 fill-white text-white" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Vidéo YouTube débloquée */}
                <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-muted/30 shadow-lg">
                  <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      className="absolute left-0 top-0 h-full w-full rounded-xl"
                      src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0`}
                      title="Replay Masterclass Zéro CAPEX – Aegis Solaire"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Ressource experte sélectionnée par Aegis Solaire : L&apos;exemple du modèle Sofiac.
                </p>

                {/* CTA vers simulateur */}
                <Card className="mx-auto mt-10 max-w-2xl border-primary/20 bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Prêt à appliquer ce modèle à votre propre entreprise ?
                    </CardTitle>
                    <CardDescription>
                      Calculez la rentabilité de vos toitures et parkings en 2 minutes.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button asChild className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">
                      <Link href="/#simulator">Lancer ma simulation</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
