import { redirect } from "next/navigation"

interface PartnerLeadPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PartnerLeadPage({ params, searchParams }: PartnerLeadPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams

  const query = new URLSearchParams()
  query.set("lead", id)

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (key === "lead") continue
    if (typeof value === "string") {
      query.set(key, value)
    } else if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v))
    }
  }

  redirect(`/partenaires/dashboard?${query.toString()}`)
}
