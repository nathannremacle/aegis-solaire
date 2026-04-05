import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { InstitutionalHero } from "@/components/institutional-hero"
import type { Metadata } from "next"

export function LegalPageShell({
  title,
  badge = "Informations légales",
  description,
  children,
}: {
  title: string
  badge?: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] -translate-x-[200%] rounded bg-primary px-3 py-2.5 text-sm text-primary-foreground transition-transform focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [margin-left:env(safe-area-inset-left)] [margin-top:env(safe-area-inset-top)]"
      >
        Aller au contenu principal
      </a>
      <Header />
      <InstitutionalHero badge={badge} title={title} subtitle={description} compact />
      <main
        id="main-content"
        className="flex-1 bg-background py-10 sm:py-14 [padding-bottom:env(safe-area-inset-bottom)]"
        role="main"
      >
        <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
