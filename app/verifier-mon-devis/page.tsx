import type { Metadata } from "next"
import { VerifyQuoteClient } from "@/components/quote-audit/verify-quote-client"

export const metadata: Metadata = {
  title: "Vérifier mon devis solaire gratuitement en 24h | Aegis Solaire Wallonie",
  description:
    "Vous avez déjà reçu un devis panneaux solaires ? Faites contrôler gratuitement le prix €/kWc, les composants Tier-1 et la conformité RGIE par la Cellule Technique Aegis Solaire.",
  alternates: {
    canonical: "https://www.aegissolaire.com/verifier-mon-devis",
  },
}

export default function VerifyQuotePage() {
  return <VerifyQuoteClient />
}
