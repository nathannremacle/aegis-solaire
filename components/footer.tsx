import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white text-neutral-800 [padding-bottom:max(2.5rem,env(safe-area-inset-bottom))]" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-5 lg:gap-12">
          {/* Brand */}
          <div className="min-w-0 lg:col-span-1">
            <Link href="/" className="inline-flex min-w-0 items-center">
              <div className="relative h-12 w-48 min-w-0 max-w-[55vw] shrink sm:h-16 sm:w-60 sm:max-w-none md:h-20 md:w-80">
                <Image
                  src="/logo.png"
                  alt="Aegis Solaire"
                  fill
                  className="object-contain object-left"
                  sizes="(max-width: 640px) 240px, 320px"
                />
              </div>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-neutral-500">
              Financement, rentabilité et ombrières professionnelles. La plateforme de référence pour le solaire B2B et les obligations PEB en Wallonie.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#001D3D]">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#preuve"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Études de cas
                </Link>
              </li>
              <li>
                <Link
                  href="#expert"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Notre expertise
                </Link>
              </li>
              <li>
                <Link
                  href="#benefits"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Avantages
                </Link>
              </li>
              <li>
                <Link
                  href="#simulator"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Simulateur ROI
                </Link>
              </li>
              <li>
                <Link
                  href="/partenaires"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Devenir Partenaire
                </Link>
              </li>
              <li>
                <Link
                  href="/media-partners"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Media Partners
                </Link>
              </li>
            </ul>
          </div>

          {/* Ressources (Content Marketing / SEO) */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#001D3D]">
              Ressources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/#preuve"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Études de cas chiffrées
                </Link>
              </li>
              <li>
                <Link
                  href="/#expert"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Subventions & financement
                </Link>
              </li>
              <li>
                <Link
                  href="/webinaire"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Webinaires & masterclass
                </Link>
              </li>
              <li>
                <Link
                  href="/faq-technique"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  FAQ technique (PEB, CV, financement)
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#001D3D]">
              Informations légales
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/mentions-legales"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link
                  href="/politique-confidentialite"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link
                  href="/politique-confidentialite#desinscription"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  Désinscription / Opposition
                </Link>
              </li>
              <li>
                <Link
                  href="/cgv"
                  className="text-sm text-neutral-500 hover:text-[#001D3D]"
                >
                  CGV
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="min-w-0">
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#001D3D]">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li className="break-all">contact@aegissolaire.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-neutral-200 pt-6 sm:mt-12 sm:pt-8">
          <p className="text-center text-xs text-neutral-400 sm:text-sm">
            &copy; {new Date().getFullYear()} Aegis Solaire. Tous droits
            réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}
