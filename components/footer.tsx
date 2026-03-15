import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-5 lg:gap-12">
          {/* Brand */}
          <div className="min-w-0 lg:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <div className="relative h-16 w-60 shrink-0 sm:h-20 sm:w-80">
                <Image
                  src="/logo.png"
                  alt="Aegis Solaire"
                  fill
                  className="object-contain object-left"
                  sizes="(max-width: 640px) 240px, 320px"
                />
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Financement, Rentabilité & Ombrières Pro. La plateforme de référence pour les projets photovoltaïques B2B en France, en Belgique et en francophonie.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#preuve"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Études de cas
                </Link>
              </li>
              <li>
                <Link
                  href="#expert"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Notre expertise
                </Link>
              </li>
              <li>
                <Link
                  href="#benefits"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Avantages
                </Link>
              </li>
              <li>
                <Link
                  href="#simulator"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Simulateur ROI
                </Link>
              </li>
            </ul>
          </div>

          {/* Ressources (Content Marketing / SEO) */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Ressources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/ressources#etudes-de-cas"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Études de cas chiffrées
                </Link>
              </li>
              <li>
                <Link
                  href="/ressources#subventions"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Subventions & financement
                </Link>
              </li>
              <li>
                <Link
                  href="/ressources#webinaires"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Webinaires Loi LOM
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Informations légales
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/mentions-legales"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  href="/politique-confidentialite"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/politique-confidentialite#desinscription"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Désinscription / Opposition
                </Link>
              </li>
              <li>
                <Link
                  href="/cgv"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  CGV
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="min-w-0">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="break-all">contact@aegissolaire.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 sm:mt-12 sm:pt-8">
          <p className="text-center text-xs text-muted-foreground sm:text-sm">
            &copy; {new Date().getFullYear()} Aegis Solaire. Tous droits
            réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}
