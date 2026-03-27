import type { FaqItem } from "@/components/StructuredData"

/** FAQ technique B2B Wallonie — source unique pour JSON-LD et page /faq-technique */
export const FAQ_TECHNIQUE_ITEMS: FaqItem[] = [
  {
    question:
      "Comment les Certificats Verts (CWaPE) influencent-ils la rentabilité d'une centrale B2B en Wallonie ?",
    answer:
      "Au-delà de 10 kW, le soutien wallon s'appuie sur le marché des Certificats Verts, sous supervision de la CWaPE. Le nombre de CV dépend de la production certifiée et de coefficients réglementaires (kECO, kCO2) ; le SPW Énergie gère des enveloppes avec réservation préalable. Les CV s'ajoutent aux économies sur prélèvements ; le cadre prévoit un filet de rachat par Elia à prix plancher pour les CV invendus, ce qui aide la bancabilité — sous réserve de dossier conforme (RGIE) et de calendrier de réservation.",
  },
  {
    question: "Pourquoi un DAF doit-il anticiper la réservation auprès du SPW Énergie avant d'engager un investissement ?",
    answer:
      "Les droits à Certificats Verts sont plafonnés par enveloppes budgétaires : la règle du premier arrivé, premier servi peut repousser ou conditionner votre rentabilité si le dossier arrive trop tard. Avant commande de matériel, il faut un dossier technique solide, souvent validé en amont avec le gestionnaire de réseau de distribution (GRD). Pour un DAF, c'est un risque de calendrier et de VAN : l'étude doit synchroniser investissement, réservation SPW et raccordement.",
  },
  {
    question: "Quelles exigences PEB (2026-2030) concernent le non résidentiel en Wallonie ?",
    answer:
      "La trajectoire wallonne renforce l'intégration d'énergies renouvelables sur site ou à proximité (ex. quota élevé de couverture du besoin pour le neuf ou travaux assimilés), accompagne l'interdiction de certains chauffages fossiles sur neuf/reconstruction, et croise les obligations en mobilité (IRVE) qui augmentent les pics de puissance. La solarisation des toitures et parkings devient un levier pour tenir la performance PEB tout en maîtrisant l'injection vers le GRD.",
  },
  {
    question: "En quoi le Plan PACE 2030 impacte-t-il la stratégie patrimoniale d'une entreprise ?",
    answer:
      "Le Plan Air Climat Énergie fixe des objectifs de réduction de consommation et d'émissions pour le tertiaire et l'industrie léger : l'inaction peut se traduire par un patrimoine mal aligné sur les attentes de marché (revente, refinancement, critères ESG). Un programme solaire documenté améliore la lisibilité de votre trajectoire bas-carbone et la valeur résiduelle de l'actif.",
  },
  {
    question: "Ores, Resa, autres GRD : qu'est-ce qui conditionne coût et délai de raccordement ?",
    answer:
      "Votre site est raccordé via un gestionnaire de réseau de distribution (GRD) — en Wallonie, notamment Ores ou Resa selon la zone. Le GRD valide la capacité d'accueil, les protections et parfois le renforcement ; au-delà d'un certain seuil, le transport (Elia) entre en jeu. L'injection excédentaire est valorisée à un tarif d'injection inférieur au prix d'achat : le dimensionnement doit maximiser l'autoconsommation et éviter une surproduction coûteuse en réseau.",
  },
  {
    question: "Quel ordre de grandeur sur un entrepôt logistique de 2 000 m² en Wallonie ?",
    answer:
      "À titre indicatif, une étude type sur 2 000 m² peut retenir de l'ordre de 45 000 € d'économies annuelles sur la facture, avec une autoconsommation cible autour de 72 % et un TRI souvent discuté dans une fourchette 5 à 7 ans selon hypothèses de prix, de CV et de montage. Les chiffres réels dépendent du profil de charge, du GRD et de la réservation SPW Énergie.",
  },
  {
    question: "Achat propre, Corporate PPA ou tiers-investissement : comment un DAF wallon arbitre-t-il ?",
    answer:
      "L'achat propre capitalise la DPI à 40 % (depuis 2025) et peut se combiner au prêt subordonné Easy'Green (Wallonie Entreprendre) pour préserver les garanties bancaires. Le Corporate PPA fige un prix sur 10-25 ans et limite l'exposition au marché ; le tiers-investissement vise un zéro CAPEX en transférant le risque technique et le bénéfice des CV au partenaire financier. Le bon modèle dépend du WACC, du bilan, des plafonds d'enveloppe SPW et de la politique de couverture énergétique du groupe.",
  },
  {
    question: "Pourquoi nos partenaires sont-ils certifiés RESCERT Photovoltaïque ?",
    answer:
      "En Belgique, la conformité au RGIE et une qualification reconnue comme RESCERT Photovoltaïque sont essentielles pour les assurances, la mise en service et le marché des Certificats Verts (CWaPE). Nos partenaires suivent ce cadre pour réduire l'aléa technique et sécuriser les délais — critère décisif quand un DAF engage la signature du client et le calendrier de réservation SPW Énergie.",
  },
]

/** Index de la question suivie du tableau comparatif financement (0-based) */
export const FAQ_FINANCING_TABLE_AFTER_INDEX = 6
