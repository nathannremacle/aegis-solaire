"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, ArrowRight } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

type SearchResult = {
  id: string
  type: string
  title: string
  subtitle: string
  badge?: string
  url: string
}

export function AdminCommandMenu() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!query) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
          headers: { "x-admin-request": "true" }
        })
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch (err) {
        console.error("Search error", err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  const leads = results.filter((r) => r.type === "lead")
  const installateurs = results.filter((r) => r.type === "installateur")
  const partners = results.filter((r) => r.type === "partner" || r.type === "media_partner")

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span>Rechercher...</span>
        </div>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex mr-1">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Rechercher un lead, partenaire, installateur..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center p-6 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Recherche en cours...</span>
              </div>
            ) : (
              "Aucun résultat trouvé."
            )}
          </CommandEmpty>

          {!loading && leads.length > 0 && (
            <CommandGroup heading="Leads">
              {leads.map((lead) => (
                <CommandItem
                  key={lead.id}
                  value={lead.id}
                  onSelect={() => runCommand(() => router.push(lead.url))}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{lead.title}</span>
                    <span className="text-xs text-muted-foreground">{lead.subtitle}</span>
                  </div>
                  {lead.badge && (
                    <Badge variant="outline" className="text-[10px] font-normal uppercase">
                      {lead.badge}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading && installateurs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Installateurs Actifs">
                {installateurs.map((inst) => (
                  <CommandItem
                    key={inst.id}
                    value={inst.id}
                    onSelect={() => runCommand(() => router.push(inst.url))}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{inst.title}</span>
                      <span className="text-xs text-muted-foreground">{inst.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!loading && partners.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Partenaires & Marketeurs">
                {partners.map((partner) => (
                  <CommandItem
                    key={partner.id}
                    value={partner.id}
                    onSelect={() => runCommand(() => router.push(partner.url))}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{partner.title}</span>
                      <span className="text-xs text-muted-foreground">{partner.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Navigation rapide">
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/dashboard"))}>
              Tableau de bord
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/leads"))}>
              Contrôle des Leads
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/installateurs"))}>
              Installateurs
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
