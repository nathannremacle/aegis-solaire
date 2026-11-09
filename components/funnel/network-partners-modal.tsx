"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShieldCheck, Award, FileCheck2, Users, Scale, Info } from "lucide-react"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

export interface NetworkPartnersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  province?: string
}

export function NetworkPartnersModal({
  open,
  onOpenChange,
  province = "Wallonie",
}: NetworkPartnersModalProps) {
  const provinceFormatted = getProvinceDisplayLabel(province)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
        <DialogHeader className="gap-1.5">
          <div className="inline-flex items-center gap-1.5 text-accent text-xs font-mono font-medium">
            <ShieldCheck className="h-4 w-4" />
            <span>Charte du Réseau Partenaire</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold">
            Critères d'attribution du lot de 3 installateurs
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Comment Aegis Solaire garantit l'impartialité et l'excellence technique en province de{" "}
            <span className="font-semibold text-foreground">{provinceFormatted}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2 text-xs sm:text-sm">
          {/* Critère 1 */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border flex items-start gap-3">
            <Award className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">Certification RESCert obligatoire</span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                Chaque installateur partenaire est titulaire du certificat officiel wallon RESCert photovoltaïque en cours de validité (compétences techniques et raccordement RGIE certifiés).
              </span>
            </div>
          </div>

          {/* Critère 2 */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border flex items-start gap-3">
            <Scale className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">Impartialité & Règle des 3 offres</span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                Le lot de 3 installateurs est indivisible. Aucun installateur ne peut acheter l'exclusivité d'un code postal. La mise en concurrence frontale garantit le juste prix sans commission de courtage.
              </span>
            </div>
          </div>

          {/* Critère 3 */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border flex items-start gap-3">
            <FileCheck2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">Zéro démarchage agressif</span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                Les artisans partenaires s'engagent à respecter votre règle de contact (écrit d'abord par SMS/e-mail si sélectionné) et n'ont pas le droit de céder vos informations à des tiers.
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-accent/[0.06] border border-accent/20 text-2xs sm:text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <span>En validant votre demande, votre appel d&apos;offres est transmis simultanément à 3 entreprises locales sélectionnées dans le répertoire officiel Aegis Solaire pour votre province.</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

