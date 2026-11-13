import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Aegis Solaire Admin",
    template: "%s | Aegis Solaire Admin",
  },
  description: "Espace d'administration et de supervision Aegis Solaire",
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
