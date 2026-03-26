import Link from "next/link"
import { Video, ArrowRight } from "lucide-react"

export function WebinairePromo() {
  return (
    <section
      className="overflow-x-hidden border-y border-border bg-muted/30 py-8 sm:py-10 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      aria-labelledby="webinaire-promo-title"
    >
      <div className="mx-auto max-w-5xl min-w-0 px-4 sm:px-6 lg:px-8">
        <Link
          href="/webinaire"
          className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-primary/10 bg-card p-6 shadow-sm transition-all hover:border-accent/30 hover:shadow-md sm:flex-row sm:justify-between sm:gap-6 sm:p-6"
        >
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/15">
              <Video className="h-7 w-7 text-accent" />
            </div>
            <div className="min-w-0">
              <h4 id="webinaire-promo-title" className="text-lg font-bold text-foreground sm:text-xl">
                Replay : sécuriser prix & patrimoine en Wallonie
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Corporate PPA, tiers-investissement et lecture des Certificats Verts pour les DAF : comment Aegis Solaire structure des projets B2B à forte valeur, sans perdre le fil du raccordement GRD (Ores, Resa) ni du calendrier SPW.
              </p>
            </div>
          </div>
          <span className="flex w-full shrink-0 sm:w-auto">
            <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-8 text-sm font-medium text-accent-foreground transition-all group-hover:bg-accent/90 group-hover:gap-3 sm:w-auto">
              Voir le replay gratuit
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </span>
        </Link>
      </div>
    </section>
  )
}
