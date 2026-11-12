import fs from "node:fs"
import path from "node:path"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  InstallerDirectory,
  type RescertInstaller,
} from "@/components/partners/installer-directory"
import { ShieldCheck, Award, Users2 } from "lucide-react"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata = {
  title: "Annuaire Officiel des Installateurs RESCert Photovoltaïque Wallonie & Bruxelles | Aegis Solaire",
  description:
    "Consultez les 784 installateurs photovoltaïques certifiés RESCert en Wallonie et à Bruxelles (Liège, Namur, Hainaut, Brabant wallon, Bruxelles, Luxembourg). Revendiquez votre fiche entreprise et accédez aux chantiers solaires qualifiés sans guerre des prix.",
  alternates: {
    canonical: `${baseUrl}/partenaires/annuaire`,
  },
}

function getInstallersData(): RescertInstaller[] {
  try {
    const filePath = path.resolve(process.cwd(), "lib/data/rescert-wallonie-installateurs.json")
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8")
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error("Erreur lecture annuaire rescert:", err)
  }
  return []
}

export default function AnnuairePartenairesPage() {
  const installers = getInstallersData()

  // JSON-LD pour l'annuaire de professionnels locaux (Google SEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Annuaire des Installateurs Photovoltaïques Certifiés RESCert en Wallonie & Bruxelles",
    description: "Répertoire des professionnels de l'énergie solaire agréés RESCert en Wallonie et à Bruxelles.",
    numberOfItems: installers.length,
    itemListElement: installers.slice(0, 30).map((inst, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LocalBusiness",
        name: inst.companyName,
        address: {
          "@type": "PostalAddress",
          addressLocality: inst.city,
          postalCode: inst.postalCode,
          addressRegion: inst.provinceLabel,
          addressCountry: "BE",
        },
      },
    })),
  }

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans bg-background text-foreground selection:bg-accent/15 selection:text-foreground">
      <Header />

      <main className="min-w-0 flex-1">
        {/* ─── Hero Section de l'Annuaire RESCert ─── */}
        <section className="border-b border-border py-14 md:py-20 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent border border-accent/20 w-fit">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>REGISTRE OFFICIEL CERTIFIÉ · WALLONIE & BRUXELLES</span>
              </div>

              {/* UN SEUL H1 DANS LE DOM */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-heading">
                Annuaire des installateurs solaires agréés RESCert en Wallonie & Bruxelles
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-sans">
                Aegis Solaire collabore exclusivement avec les professionnels qualifiés du photovoltaïque. Retrouvez les 784 entreprises certifiées de Wallonie et de Bruxelles sélectionnées pour leur rigueur technique et leur conformité réglementaire.
              </p>

              {/* Badges de Réassurance */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 border border-border">
                  <Award className="h-3.5 w-3.5 text-accent" />
                  <span>784 Entreprises Agréées</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 border border-border">
                  <Users2 className="h-3.5 w-3.5 text-accent" />
                  <span>100% Vérifiés BCE & RESCert</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 border border-border">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                  <span>Zéro Poseur Non-Qualifié</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Contenu Interactif : Moteur de Recherche & Fiches ─── */}
        <section className="py-12 md:py-16 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <InstallerDirectory initialInstallers={installers} />
          </div>
        </section>
      </main>

      <Footer />

      {/* JSON-LD Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
