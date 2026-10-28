import { Suspense } from "react"
import { InvitationClient } from "./invitation-client"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Invitation Privée Installateur RESCERT | Aegis Solaire Wallonie",
  description:
    "Vous êtes invité par la Direction des Partenariats à rejoindre le réseau d'installateurs photovoltaïques Aegis Solaire en Wallonie. Leads qualifiés, exclusivité B2B et transparence B2C.",
  alternates: {
    canonical: `${baseUrl}/partenaires/invitation`,
  },
  robots: {
    index: false, // Invitation privée nominative, pas d'indexation SEO nécessaire
    follow: false,
  },
}

interface PartenairesInvitationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PartenairesInvitationPage({
  searchParams,
}: PartenairesInvitationPageProps) {
  const resolved = await searchParams
  const rawNom =
    typeof resolved.nom === "string"
      ? resolved.nom
      : typeof resolved.name === "string"
      ? resolved.name
      : ""
  const rawCie =
    typeof resolved.cie === "string"
      ? resolved.cie
      : typeof resolved.company === "string"
      ? resolved.company
      : ""
  const inviter =
    typeof resolved.par === "string" && resolved.par.trim()
      ? resolved.par.trim()
      : "Direction des Partenariats"

  const nom = rawNom ? rawNom.charAt(0).toUpperCase() + rawNom.slice(1).trim() : ""
  const cie = rawCie ? rawCie.trim() : ""

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <InvitationClient
        initialNom={nom}
        initialCie={cie}
        initialInviter={inviter}
      />
    </Suspense>
  )
}
