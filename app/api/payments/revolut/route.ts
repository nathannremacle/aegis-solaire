import { NextResponse } from "next/server"

/**
 * Endpoint Revolut désactivé pour des raisons de sécurité.
 * Conformément à la gouvernance de la plateforme, les packs de crédits
 * partenaires sont émis sur facture officielle INIT42 et réglés par virement bancaire.
 * L'allocation des crédits est validée par l'administrateur.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Paiement automatique en ligne indisponible. Les commandes de packs de crédits sont traitées par virement bancaire sur facture pro (INIT42). Veuillez effectuer votre demande directement depuis l'onglet Crédits de votre espace partenaire.",
    },
    { status: 503 }
  )
}

export async function GET() {
  return NextResponse.json(
    { status: "disabled", message: "Revolut direct stub endpoint is disabled." },
    { status: 403 }
  )
}
