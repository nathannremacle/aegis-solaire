import { redirect } from "next/navigation"
import { getPartner } from "@/lib/partner-auth"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com"

export const metadata = {
  title: "Marketplace Leads | Portail Installateur | Aegis Solaire",
  description:
    "Marketplace des leads solaires B2B & B2C en Wallonie — déblocage par crédits, suivi temps réel pour installateurs partenaires Aegis Solaire.",
  alternates: { canonical: `${baseUrl}/partenaires/dashboard` },
  robots: { index: false, follow: false },
}

export default async function PartenairesDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const partner = await getPartner()
  if (!partner) {
    redirect("/partenaires/login")
  }
  return <>{children}</>
}
