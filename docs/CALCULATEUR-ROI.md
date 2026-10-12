# Calculateur ROI – fonctionnement et messages

Ce document décrit comment fonctionne le simulateur de retour sur investissement (ROI) du site Aegis Solaire, quelles valeurs il utilise et quels messages sont affichés à l'écran 6 (formulaire de capture).

---

## 1. Principe : calculateur fiable et réel

- **Toutes les valeurs saisies sont utilisées telles quelles** pour le calcul. Aucune valeur n'est remplacée ou « plafonnée » pour faire apparaître un meilleur résultat.
- **Surface** : si vous choisissez une tranche (« < 1 500 m² », « > 1 500 m² », etc.) ou que vous indiquez une **surface exacte** (ex. 800 m²), le calculateur utilise **cette valeur** (800 m², 1 500 m², 2 000 m², etc.).
- **Facture d'électricité** : soit la tranche choisie (valeurs représentatives : 10 k€, 35 k€, 75 k€, 150 k€), soit le **montant exact** saisi (ex. 45 000 €).
- Le **ROI affiché n'est pas plafonné** : si le calcul donne 18 ans ou 22 ans, ce chiffre est affiché (et le message adapté).

---

## 2. Formule de calcul du ROI

Les étapes du calcul sont les suivantes :


| Étape                       | Formule / règle                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------ |
| **Puissance installée**     | `surface (m²) × 0,15` → résultat en kWc (kilowatts-crête). Ex. : 2 000 m² → 300 kWc. |
| **Production annuelle**     | `puissance (kWc) × 1 100` kWh/an (ordre de grandeur France / Belgique).              |
| **Économies potentielles**  | `production (kWh) × 0,18 €/kWh` (prix électricité retenu).                           |
| **Consommation estimée**    | `facture annuelle (€ HT) ÷ 0,18` → kWh/an.                                           |
| **Taux d'autoconsommation** | Rapport consommation / production, **plafonné à 85 %**.                              |
| **Économies réelles**       | Économies potentielles × (taux d'autoconsommation / 100).                            |
| **Coût d'installation**     | `puissance (kWc) × 1 200 €/kWc` (ordre de grandeur grandes installations).           |
| **ROI (années)**            | `coût d'installation ÷ économies réelles annuelles`.                                 |


Exemple : surface 1 000 m², facture 35 000 €/an → puissance 150 kWc, production 165 000 kWh, consommation ≈ 194 000 kWh → autoconsommation plafonnée, économies réelles, coût 180 000 € → ROI peut par exemple se situer autour de 10–12 ans selon les arrondis.

---

## 3. Valeurs utilisées selon les choix du visiteur

### Surface

- **Tranche choisie** (sans « surface exacte ») :
  - Parking : « < 1 500 m² » → **1 500 m²** ; « > 1 500 m² » → **2 000 m²**.
  - Toiture : « < 500 m² » → 500 ; « 500 à 1 000 m² » → 750 ; « > 1 000 m² » → 1 500.
  - Friche : **1 000 m²**.
- **Surface exacte** renseignée (champ libre) : la **valeur saisie** est utilisée (min. 500 m²). Ex. : 800 m² pour un parking → le calcul se fait bien avec **800 m²**.

### Facture annuelle (€ HT)

- **Tranche** : Moins de 20 k€ → 10 000 ; 20–50 k€ → 35 000 ; 50–100 k€ → 75 000 ; Plus de 100 k€ → 150 000.
- **Montant exact** : la **valeur saisie** est utilisée (min. 5 000 €).

---

## 4. Messages affichés à l’écran 6 (avant le formulaire de contact)

Le bloc de texte au-dessus du formulaire (« Bonne nouvelle… », « Votre projet mérite une étude… », etc.) dépend **uniquement** du résultat du calcul et des données saisies.

### Conditions et messages


| Condition                                                                        | Titre                                                                  | Contenu type                                                                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **ROI < 8 ans**                                                                  | Excellent potentiel de rentabilité sur votre site                      | ROI estimé < 8 ans + phrase selon type de surface + objectif.                                                                |
| **ROI entre 8 et 12 ans** **et** surface ≥ 1 000 m² **et** facture ≥ 20 000 €/an | Bonne nouvelle, votre site présente un fort potentiel de rentabilité ! | ROI 8–12 ans, **éligible à un financement intégral par un tiers-investisseur (zéro avance)** + phrase surface + objectif.    |
| **ROI entre 8 et 12 ans** (sans les critères ci‑dessus)                          | Bonne nouvelle, votre site présente un fort potentiel de rentabilité ! | ROI 8–12 ans + étude détaillée et options de financement + phrase surface + objectif.                                        |
| **ROI entre 12 et 15 ans**                                                       | Votre projet présente un potentiel de rentabilité                      | ROI 12–15 ans + étude pour chiffres réels et options (PPA, tiers-investissement selon critères) + surface + objectif.        |
| **ROI ≥ 15 ans**                                                                 | Votre projet mérite une étude personnalisée                            | **Le ROI estimé dépasse 15 ans** sur votre configuration + analyse détaillée et leviers d’optimisation + surface + objectif. |


### Phrases ajoutées selon le type de surface

- **Parking** :
  - Surface **≥ 1 500 m²** : « Pour un parking de cette envergure, la solarisation / ombrières peut être un levier fort (IRVE, pics de puissance). »
  - Surface **< 1 500 m²** : « Votre surface est sous le seuil souvent retenu pour les grands parkings ; une étude personnalisée peut préciser les options pour votre cas. »
- **Toiture** : « Les toitures tertiaires et industrielles sont des gisements solaires prioritaires. »
- **Friche** : « La valorisation d'un terrain ou d'une friche par le solaire est un levier de revenu et de décarbonation. »

### Phrases ajoutées selon l’objectif (écran 1)

- Mise en conformité → obligations, échéances, risque d’amende.
- Réduction de la facture → autoconsommation au centre de l’analyse.
- RSE → gain carbone et contribution RSE.
- Revenu → valorisation (location toiture/terrain, PPA).

---

## 5. Pourquoi le message « ROI dépasse 15 ans » s’affiche souvent

Ce message apparaît lorsque le **ROI calculé est ≥ 15 ans**. C’est le cas typiquement quand :

- **Surface faible** (ex. 500–800 m²) et/ou **facture faible** (ex. 10 000 €/an) : peu de production et/ou peu d’économies par an → ROI plus long.
- **Combinaison défavorable** : petite surface + faible consommation → le calculateur donne un ROI réaliste, souvent > 15 ans.

Le simulateur ne triche pas : il affiche le résultat du calcul. Si vous testez avec une **grande surface** (ex. 2 000 m²) et une **facture élevée** (ex. 75 000 €/an), vous devriez voir un ROI plus court et donc un autre message (« fort potentiel », « ROI 8–12 ans », etc.).

---

## 6. Enregistrement de la demande (API)

- La **surface** envoyée à l’API est **celle utilisée dans le calcul** (y compris une surface exacte < 1 500 m² pour un parking).
- L’API accepte une surface **≥ 500 m²** pour tous les types (parking, toiture, friche). Les projets sous le seuil LOM (parking < 1 500 m²) sont donc enregistrés ; l’éligibilité LOM est indiquée dans les messages à l’écran, pas par un refus d’enregistrement.

---

## 7. Fichier concerné

- Logique du calculateur et choix des messages : `components/roi-simulator.tsx` (fonctions `calculateROI`, `getSurfaceAreaFromChoices`, `getAnnualBillFromBracket`, et bloc « Écran 6 »).

