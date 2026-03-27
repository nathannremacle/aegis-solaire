import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Dashboard partenaire",
  description:
    "Marketplace des leads B2B solaire Wallonie — crédits, déblocage et suivi pour installateurs partenaires Aegis Solaire.",
  alternates: { canonical: `${baseUrl}/partenaires/dashboard` },
  robots: { index: false, follow: false },
}

export default function PartenairesDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
