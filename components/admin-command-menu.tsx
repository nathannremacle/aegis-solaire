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
import { Kbd } from "@/components/ui/kbd"

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
        setOpen((prev) => !prev)
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
          headers: { "x-admin-request": "true" },
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
    }, 250)

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
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-xs">Rechercher...</span>
        </div>
        <Kbd className="font-mono text-[10px]">⌘K</Kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher lead, installateur, TVA, code postal..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="custom-scrollbar">
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center p-6 gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Recherche dans la base de données...</span>
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
                    <span className="font-medium text-sm text-foreground">{lead.title}</span>
                    <span className="text-xs text-muted-foreground">{lead.subtitle}</span>
                  </div>
                  {lead.badge && (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
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
              <CommandGroup heading="Installateurs">
                {installateurs.map((inst) => (
                  <CommandItem
                    key={inst.id}
                    value={inst.id}
                    onSelect={() => runCommand(() => router.push(inst.url))}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground">{inst.title}</span>
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
              <CommandGroup heading="Partenaires & Apporteurs">
                {partners.map((partner) => (
                  <CommandItem
                    key={partner.id}
                    value={partner.id}
                    onSelect={() => runCommand(() => router.push(partner.url))}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground">{partner.title}</span>
                      <span className="text-xs text-muted-foreground">{partner.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/dashboard"))}>
              <span>Cockpit</span>
              <Kbd className="ml-auto font-mono text-[10px]">G H</Kbd>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/leads?view=triage"))}>
              <span>Triage des Leads</span>
              <Kbd className="ml-auto font-mono text-[10px]">G T</Kbd>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/leads"))}>
              <span>Pipeline des Leads</span>
              <Kbd className="ml-auto font-mono text-[10px]">G L</Kbd>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/disputes"))}>
              <span>Litiges & Qualité</span>
              <Kbd className="ml-auto font-mono text-[10px]">G D</Kbd>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/relances"))}>
              <span>Relances Mails & Cascades</span>
              <Kbd className="ml-auto font-mono text-[10px]">G R</Kbd>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/partners"))}>
              <span>Installateurs & Capacité</span>
              <Kbd className="ml-auto font-mono text-[10px]">G I</Kbd>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/admin/finance"))}>
              <span>Finances & Virements</span>
              <Kbd className="ml-auto font-mono text-[10px]">G F</Kbd>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
