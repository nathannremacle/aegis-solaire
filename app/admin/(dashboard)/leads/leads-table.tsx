"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Lead = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  company: string | null
  surface_type: string
  surface_area: number
  annual_electricity_bill: number
  estimated_roi_years: number | null
  autoconsumption_rate: number | null
  estimated_savings: number | null
  status: string
  created_at: string
}

export function LeadsTable({
  leads,
  total,
  page,
  limit,
  statusFilter,
  searchDefault = "",
}: {
  leads: Lead[]
  total: number
  page: number
  limit: number
  statusFilter: string
  searchDefault?: string
}) {
  const router = useRouter()
  const totalPages = Math.ceil(total / limit) || 1

  function onStatusChange(value: string) {
    const params = new URLSearchParams()
    if (value) params.set("status", value)
    if (searchDefault) params.set("search", searchDefault)
    params.set("page", "1")
    router.push(`/admin/leads?${params.toString()}`)
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim()
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)
    if (email) params.set("search", email)
    params.set("page", "1")
    router.push(`/admin/leads?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={onSearch} className="flex gap-2">
          <Input
            name="search"
            placeholder="Rechercher par email..."
            className="w-48"
            defaultValue={searchDefault}
          />
          <Button type="submit" variant="secondary">Rechercher</Button>
        </form>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous</SelectItem>
            <SelectItem value="new">Nouveau</SelectItem>
            <SelectItem value="contacted">Contacté</SelectItem>
            <SelectItem value="qualified">Qualifié</SelectItem>
            <SelectItem value="converted">Converti</SelectItem>
            <SelectItem value="lost">Perdu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Nom</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Tél.</th>
              <th className="px-4 py-3 text-left font-medium">Entreprise</th>
              <th className="px-4 py-3 text-left font-medium">Surface</th>
              <th className="px-4 py-3 text-left font-medium">Facture</th>
              <th className="px-4 py-3 text-left font-medium">ROI</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun lead.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium">{lead.first_name} {lead.last_name}</td>
                  <td className="px-4 py-3">{lead.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.company ?? "–"}</td>
                  <td className="px-4 py-3">{lead.surface_area} m² ({lead.surface_type})</td>
                  <td className="px-4 py-3">{lead.annual_electricity_bill.toLocaleString("fr-FR")} €</td>
                  <td className="px-4 py-3">{lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{lead.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} lead{total !== 1 ? "s" : ""} · page {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Link href={page > 1 ? `/admin/leads?page=${page - 1}${statusFilter ? `&status=${statusFilter}` : ""}${searchDefault ? `&search=${encodeURIComponent(searchDefault)}` : ""}` : "#"}>
              <Button variant="outline" size="sm" disabled={page <= 1}>Précédent</Button>
            </Link>
            <Link href={page < totalPages ? `/admin/leads?page=${page + 1}${statusFilter ? `&status=${statusFilter}` : ""}${searchDefault ? `&search=${encodeURIComponent(searchDefault)}` : ""}` : "#"}>
              <Button variant="outline" size="sm" disabled={page >= totalPages}>Suivant</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
