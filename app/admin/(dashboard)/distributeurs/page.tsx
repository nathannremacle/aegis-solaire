import { createServiceRoleClient } from "@/lib/supabase/admin"
import { listDistributorsWithStats } from "@/lib/distributor-partners"
import { AdminDistributorsClient } from "@/components/admin/admin-distributors-client"

export const dynamic = "force-dynamic"

export default async function AdminDistributorsPage() {
  const supabase = createServiceRoleClient()
  const { tableMissing, distributors } = await listDistributorsWithStats(supabase)
  const siteBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
          Étage 3 · Effet de Levier Grossistes PV &amp; Moteur Croissance
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
          Alliés Distributeurs PV &amp; Croissance
        </h1>
        <p className="text-sm text-muted-foreground">
          Générez des pages d&apos;inscription co-brandées et des fiches RDV imprimables pour les grossistes belges, et pilotez les relances automatisées.
        </p>
      </div>

      <AdminDistributorsClient
        initialDistributors={distributors}
        tableMissing={tableMissing}
        siteBaseUrl={siteBaseUrl}
      />
    </div>
  )
}
