"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  ShieldCheck,
  Search,
  MapPin,
  ArrowRight,
  Sparkles,
  Building2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface RescertInstaller {
  id: string
  companyName: string
  certifiedPerson: string
  email: string
  phone: string
  postalCode: string
  city: string
  provinceKey: string
  provinceLabel: string
  category: string
  certified: boolean
}

interface InstallerDirectoryProps {
  initialInstallers: RescertInstaller[]
}

const PROVINCE_TABS = [
  { key: "all", label: "Toute la région (784)" },
  { key: "liege", label: "Liège (257)" },
  { key: "hainaut", label: "Hainaut (199)" },
  { key: "namur", label: "Namur (115)" },
  { key: "brabant_wallon", label: "Brabant wallon (75)" },
  { key: "bruxelles", label: "Bruxelles (69)" },
  { key: "luxembourg", label: "Luxembourg (69)" },
]

export function InstallerDirectory({ initialInstallers }: InstallerDirectoryProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [page, setPage] = useState<number>(1)
  const pageSize = 24

  const filteredInstallers = useMemo(() => {
    let list = initialInstallers

    if (selectedProvince !== "all") {
      list = list.filter((i) => i.provinceKey === selectedProvince)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (i) =>
          i.companyName.toLowerCase().includes(q) ||
          i.certifiedPerson.toLowerCase().includes(q) ||
          i.city.toLowerCase().includes(q) ||
          i.postalCode.includes(q)
      )
    }

    return list
  }, [initialInstallers, selectedProvince, searchQuery])

  // Reset pagination on filter change
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredInstallers.slice(start, start + pageSize)
  }, [filteredInstallers, page, pageSize])

  const totalPages = Math.ceil(filteredInstallers.length / pageSize)

  return (
    <div className="w-full space-y-8">
      {/* ─── Encadré d'accueil & Règle d'Activation ─── */}
      <div className="rounded-2xl border border-accent/20 bg-accent/[0.03] p-6 sm:p-8 text-left shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              <span>RÉSEAU OFFICIEL RESCERT · WALLONIE & BRUXELLES</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
              Vous êtes gérant ou installateur certifié ?
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Votre structure est déjà recensée dans notre registre technique. Retrouvez votre entreprise ci-dessous et cliquez sur <strong className="text-foreground">« Revendiquer ma fiche »</strong> pour activer votre accès partenaire, configurer vos zones prioritaires et recevoir les dossiers qualifiés sans abonnement forcé.
            </p>
          </div>
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs font-semibold px-5 h-11 shrink-0"
          >
            <Link href="/partenaires/invitation?par=Annuaire+RESCert">
              Inscription directe sans recherche
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ─── Barre de Recherche & Filtres par Province ─── */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par raison sociale, nom d'installateur, commune ou code postal (ex: Liège, Bruxelles, 1000, 4000...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="pl-10 h-12 bg-card border-border text-foreground font-sans text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Onglets Régions & Provinces */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {PROVINCE_TABS.map((tab) => {
            const isActive = selectedProvince === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setSelectedProvince(tab.key)
                  setPage(1)
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-mono transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Compteur de résultats ─── */}
      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground border-b border-border pb-3">
        <span>
          <strong className="text-foreground tabular-nums font-semibold">{filteredInstallers.length}</strong> installateurs certifiés répertoriés
        </span>
        {totalPages > 1 && (
          <span>
            Page <strong className="text-foreground tabular-nums">{page}</strong> sur <strong className="text-foreground tabular-nums">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* ─── Grille des Installateurs Agréés ─── */}
      {paginatedList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-semibold text-foreground">Aucune entreprise trouvée pour cette recherche</p>
          <p className="text-xs text-muted-foreground mt-1">
            Vérifiez l&apos;orthographe ou sélectionnez « Toute la région »
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedList.map((installer) => {
            const claimUrl = `/partenaires/invitation?company=${encodeURIComponent(
              installer.companyName
            )}&name=${encodeURIComponent(
              installer.certifiedPerson
            )}&code=${encodeURIComponent(installer.postalCode)}&par=Annuaire+RESCert`

            return (
              <div
                key={installer.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-accent/40 hover:shadow-xs transition-all duration-200"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-bold text-accent border border-accent/20">
                      <ShieldCheck className="h-3 w-3" />
                      RESCERT PV
                    </span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground border border-border">
                      {installer.provinceLabel}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading text-base font-bold text-foreground group-hover:text-accent transition-colors line-clamp-1">
                      {installer.companyName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{installer.postalCode} {installer.city}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span>Titulaire agréé :</span>
                      <strong className="text-foreground font-medium truncate max-w-[150px]">
                        {installer.certifiedPerson}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Statut réseau :</span>
                      <span className="text-accent font-mono text-[11px] font-medium">
                        Profil vérifié
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground border border-border font-mono text-xs font-semibold transition-all group-hover:border-primary"
                  >
                    <Link href={claimUrl}>
                      Revendiquer cette fiche
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="font-mono text-xs"
          >
            Précédent
          </Button>
          <span className="font-mono text-xs text-muted-foreground px-2">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="font-mono text-xs"
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}
