import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"

/** Bandeau discret en bas de page d'accueil — lien vers la FAQ technique détaillée */
export function FaqHomeTeaser() {
  return (
    <section
      className="scroll-mt-24 border-t border-border/60 bg-gradient-to-b from-muted/30 to-background py-10 sm:py-14 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      aria-labelledby="faq-teaser-heading"
    >
      <div className="mx-auto flex max-w-5xl min-w-0 flex-col items-stretch gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <BookOpen className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="faq-teaser-heading" className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              FAQ technique Wallonie
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Certificats Verts, PEB, PACE 2030, GRD et financement B2B — réponses détaillées pour DAF et direction.
            </p>
          </div>
        </div>
        <Link
          href="/faq-technique"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/40 hover:bg-muted/50 sm:self-center"
        >
          Consulter la FAQ
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
