"use client"

import * as React from "react"
import { LeadInspectionDrawer } from "../lead-inspection-drawer"

interface LeadDetailModalProps {
  lead: any
  partnerCredits?: number
  isBuying?: boolean
  onClose: () => void
  onPurchase?: (lead: any) => void
  onRequestTopUp?: () => void
}

export default function LeadDetailModal({
  lead,
  partnerCredits = 0,
  isBuying = false,
  onClose,
  onPurchase = () => {},
  onRequestTopUp = () => {},
}: LeadDetailModalProps) {
  return (
    <LeadInspectionDrawer
      lead={lead}
      partnerCredits={partnerCredits}
      isBuying={isBuying}
      onClose={onClose}
      onPurchase={onPurchase}
      onRequestTopUp={onRequestTopUp}
    />
  )
}
