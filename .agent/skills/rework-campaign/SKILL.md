---
name: rework-campaign
description: Audite et optimise une campagne Meta Ads active pour Aegis Solaire en se basant sur les métriques réelles (CTR lien, CPC, Hook rate, CVR landing, Coût par Lead CPL), applique un arbre de décision chirurgical (KILL, KEEP, SCALE, ITERATE) pour couper le gaspillage et augmenter la rentabilité.
---

# Rework Campaign — Pilotage & Optimisation des Campagnes Solaire

## 1. Métriques Clés & Seuils de Tolérance (Marché Solaire Wallon)

| Métrique | Seuil d'Alerte (Mauvais) | Seuil Cible (Sain) | Excellent |
|---|---|---|---|
| **Hook Rate (3s / Impr)** | < 20 % | 25 % à 35 % | > 40 % |
| **CTR Lien (Clics uniques)** | < 0,9 % | 1,2 % à 1,8 % | > 2,2 % |
| **CPC (Coût par Clic)** | > 1,80 € | 0,70 € à 1,20 € | < 0,50 € |
| **Taux de Conversion Landing (CVR)** | < 6 % | 8 % à 14 % | > 16 % |
| **CPL (Coût par Lead Qualifié)** | > 45 € | 22 € à 32 € | < 18 € |

*Note sur le CPL solaire wallon : Un lead qualifié vérifié au téléphone se revend entre 45 € et 75 € à un installateur. Tout CPL sous 30 € offre une marge brute très confortable.*

---

## 2. Arbre de Décision Chirurgical

### Règle 1 : KILL (Couper sans pitié)
- **Quand couper une annonce ?**
  - Si une annonce a dépensé **2x à 3x le CPL cible** (ex: 60 €) avec **0 lead généré** → **PAUSE immédiate**.
  - Si le CTR lien est < 0,8 % après 500 impressions → Le hook ou l'angle ne résonne pas, couper.

### Règle 2 : KEEP (Laisser tourner)
- L'annonce génère des leads au CPL cible (ex: 20–28 €) et son CTR est stable.
- **Règle d'or** : Ne pas toucher à une annonce qui performe tant qu'elle n'atteint pas une fréquence d'affichage > 2,8 sur l'audience.

### Règle 3 : ITERATE (Décliner le gagnant)
- Si une annonce génère un excellent CPL :
  - Isoler le Hook (les 3 premières secondes).
  - Conserver le Hook et tester 2 nouveaux corps de texte (Body) ou une nouvelle accroche de description.
  - Tester le même message sous un autre format (passer d'un statique à un carrousel ou une vidéo courte).

### Règle 4 : SCALE (Augmenter le budget)
- Ne jamais augmenter le budget d'une campagne de plus de **15 % à 20 % toutes les 48 à 72 heures**.
- Une augmentation brutale (ex: passer de 30 €/jour à 100 €/jour d'un coup) réinitialise la phase d'apprentissage de l'algorithme Meta et fait exploser le CPL.

---

## 3. Protocole de Diagnostic en Cas de Problème
1. **Les clics sont chers (CPC > 1,80 €)** → Le problème vient de la pub (hook faible, créative peu attrayante, angle saturé).
2. **Les clics sont pas chers mais pas de leads (CVR < 6%)** → Le problème vient du site ou du simulateur (friction dans le formulaire, promesse de l'ad non alignée avec la première question du simulateur, lenteur de chargement).
3. **Les leads arrivent mais ne répondent pas au téléphone** → Le message publicitaire est trop vague ou promet des "primes magiques" qui attirent des curieux non qualifiés.
