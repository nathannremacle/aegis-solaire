import { redirect } from "next/navigation"
import { getMediaPartner } from "@/lib/media-partner-auth"

export const metadata = {
  title: "Dashboard Media Partner | Aegis Solaire",
  robots: { index: false, follow: false },
}

export default async function MediaPartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let partner = null
  try {
    partner = await getMediaPartner()
  } catch {
    redirect("/media-partners/login")
  }
  if (!partner) {
    redirect("/media-partners/login")
  }

  return <>{children}</>
}
