"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, CreditCard, MapPin, Zap } from "lucide-react"

/** Données factices — remplacées par l’API Supabase au branchement. */
const MOCK_PARTNER = {
  companyName: "SolarWall Pro SPRL",
  credits: 12,
}

type LeadMarketplaceMock = {
  id: string
  ref: string
  province: string
  surfaceType: string
  surfaceArea: number
  annualBill: number
  grd: string | null
}

const MOCK_AVAILABLE_LEADS: LeadMarketplaceMock[] = [
  {
    id: "1",
    ref: "AW-2026-0142",
    province: "Liège",
    surfaceType: "Toiture",
    surfaceArea: 4_200,
    annualBill: 78_000,
    grd: "Ores",
  },
  {
    id: "2",
    ref: "AW-2026-0143",
    province: "Hainaut",
    surfaceType: "Parking",
    surfaceArea: 6_500,
    annualBill: 120_000,
    grd: "Resa",
  },
  {
    id: "3",
    ref: "AW-2026-0144",
    province: "Namur",
    surfaceType: "Terrain",
    surfaceArea: 8_000,
    annualBill: 95_000,
    grd: null,
  },
]

type LeadUnlockedMock = LeadMarketplaceMock & {
  company: string
  contactName: string
  email: string
  phone: string
  vat: string
  unlockedAt: string
}

const MOCK_UNLOCKED_LEADS: LeadUnlockedMock[] = [
  {
    id: "u1",
    ref: "AW-2026-0098",
    province: "Brabant wallon",
    surfaceType: "Toiture",
    surfaceArea: 3_100,
    annualBill: 62_000,
    grd: "AIEG",
    company: "Logistique Nord SA",
    contactName: "Jean Dupont",
    email: "j.dupont@logistiquenord.be",
    phone: "+32 475 12 34 56",
    vat: "BE0123456789",
    unlockedAt: "12 mars 2026",
  },
  {
    id: "u2",
    ref: "AW-2026-0101",
    province: "Luxembourg",
    surfaceType: "Parking",
    surfaceArea: 2_800,
    annualBill: 48_000,
    grd: "REW",
    company: "Industrie Ardenne SPRL",
    contactName: "Marie Martin",
    email: "m.martin@industrie-ardenne.be",
    phone: "+32 476 98 76 54",
    vat: "BE0987654321",
    unlockedAt: "10 mars 2026",
  },
]

function formatMoney(n: number) {
  return `${n.toLocaleString("fr-BE")} € HT / an`
}

function SurfaceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function PartnerDashboardPage() {
  const { companyName, credits } = MOCK_PARTNER

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Espace installateur</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <h1 className="font-[family-name:var(--font-dm-sans)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {companyName}
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href="/partenaires" className="text-primary underline-offset-4 hover:underline">
                Réseau partenaires Aegis Solaire
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <div
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm shadow-sm"
              role="status"
              aria-label={`Crédits disponibles : ${credits}`}
            >
              <span className="text-lg" aria-hidden>
                🔋
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Crédits disponibles</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">{credits}</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="gap-2 border-primary/20 bg-background">
              <CreditCard className="h-4 w-4" />
              Acheter des crédits
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="marketplace" className="w-full gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Leads</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Marketplace : aperçu anonymisé. Les coordonnées complètes apparaissent après déblocage (1 crédit).
              </p>
            </div>
            <TabsList className="h-10 w-full sm:w-auto">
              <TabsTrigger value="marketplace" className="px-4">
                Marketplace
              </TabsTrigger>
              <TabsTrigger value="unlocked" className="px-4">
                Mes leads débloqués
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="marketplace" className="mt-0">
            <p className="mb-4 text-xs text-muted-foreground">
              Filtre cible : <code className="rounded bg-muted px-1 py-0.5">marketplace_status === &apos;available&apos;</code>{" "}
              (données mock)
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {MOCK_AVAILABLE_LEADS.map((lead) => (
                <Card
                  key={lead.id}
                  className="border-border/80 shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-primary" />
                            {lead.province}
                          </span>
                        </CardTitle>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">Réf. {lead.ref}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Disponible
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 border-t border-border/60 pt-4">
                    <SurfaceRow label="Type de surface" value={lead.surfaceType} />
                    <SurfaceRow label="Surface" value={`${lead.surfaceArea.toLocaleString("fr-BE")} m²`} />
                    <SurfaceRow label="Facture électrique estimée" value={formatMoney(lead.annualBill)} />
                    <SurfaceRow label="GRD" value={lead.grd ?? "Non renseigné"} />
                  </CardContent>
                  <CardFooter className="border-t border-border/60 pt-4">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Débloquer ce lead (1 crédit)
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="unlocked" className="mt-0">
            <p className="mb-4 text-sm text-muted-foreground">
              Aperçu de la vue après achat : coordonnées complètes visibles uniquement pour vos leads débloqués.
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              {MOCK_UNLOCKED_LEADS.map((lead) => (
                <Card
                  key={lead.id}
                  className="border-primary/20 bg-card shadow-sm ring-1 ring-primary/10"
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Zap className="h-4 w-4 text-accent" />
                        {lead.company}
                      </CardTitle>
                      <Badge className="bg-accent text-accent-foreground hover:bg-accent/90">Débloqué</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Réf. {lead.ref} · Délégation {lead.unlockedAt}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Coordonnées</p>
                      <Separator className="my-3" />
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Contact</dt>
                          <dd className="text-right font-medium">{lead.contactName}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">E-mail</dt>
                          <dd className="break-all text-right font-medium">{lead.email}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">Téléphone</dt>
                          <dd className="text-right font-medium">{lead.phone}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted-foreground">TVA</dt>
                          <dd className="font-mono text-right font-medium">{lead.vat}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projet</p>
                      <Separator className="my-3" />
                      <div className="space-y-2">
                        <SurfaceRow label="Province" value={lead.province} />
                        <SurfaceRow label="Type de surface" value={lead.surfaceType} />
                        <SurfaceRow label="Surface" value={`${lead.surfaceArea.toLocaleString("fr-BE")} m²`} />
                        <SurfaceRow label="Facture électrique estimée" value={formatMoney(lead.annualBill)} />
                        <SurfaceRow label="GRD" value={lead.grd ?? "—"} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/60">
                    <Button variant="outline" className="w-full" type="button">
                      Exporter / CRM (bientôt)
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
