---
name: meta-campaign-launcher
description: Guide méthodologique et checklist pour configurer et lancer des campagnes Meta Ads pour Aegis Solaire en Wallonie — structure de compte (CBO vs ABO), ciblage géographique (Wallonie, provinces), installation du Pixel et de l'événement Lead sur le simulateur, paramétrage des UTMs et règles de budget initial.
---

# Meta Campaign Launcher — Aegis Solaire

## 1. Pré-Requis Techniques
1. **Domaine vérifié** dans Meta Business Manager (`aegissolaire.com` ou domaine de production).
2. **Pixel Meta & API Conversions (CAPI)** configurés avec les événements clés :
   - `PageView` : Sur toutes les pages.
   - `ViewContent` : Arrivée sur le simulateur `/devis-panneaux-solaires`.
   - `Lead` : Déclenché lors de la soumission validée du formulaire (Step 6 avec coordonnées complètes).
3. **Paramètres URL (UTM tracking)** standardisés pour le tableau de bord Aegis :
   `?utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`

---

## 2. Structure de Campagne Recommandée (Lancement)

### Campagne 1 : Acquisition Trafic Froid (Top of Funnel - TOFU)
- **Objectif** : `PROSPECTS` (Leads) avec redirection vers site web.
- **Budget** : Débuter avec un budget de test de 20 € à 30 € par jour.
- **Stratégie d'enchères** : Volume le plus élevé (sans plafond d'enchère au départ).

### Ad Sets (Ensembles de Publicités) :
- **Ad Set 1 — Audience Large Wallonie (Recommandé par l'algorithme Meta Advantage+)** :
  - *Lieu* : Belgique (Wallonie entière ou exclusions spécifiques : Liège, Namur, Brabant wallon, Hainaut, Luxembourg).
  - *Âge* : 30 à 65+ ans (propriétaires de logements).
  - *Langue* : Français.
  - *Ciblage avancé* : Laisser ouvert (l'algorithme Meta trouve les propriétaires grâce au hook et à la sémantique de l'ad).
- **Ad Set 2 — Intérêts & Signaux Propriétaires (Optionnel pour test)** :
  - *Intérêts* : Amélioration de l'habitat, Rénovation, Panneau solaire, Énergie renouvelable.

### Annonces par Ad Set (Règle 3x3) :
- Toujours tester **3 à 5 créatives distinctes** par Ad Set :
  - 1 x Vidéo scriptée 60s face caméra ou motion.
  - 1 x Visuel statique "Carte d'Audit Technique" (Format A).
  - 1 x Carrousel "Vrai / Faux Réglementaire" (Format B).
  - 1 x Visuel statique focalisé sur les économies en euros (Format C).

---

## 3. Checklist de Lancement ("Go / No-Go")
- [ ] Le lien de destination pointe bien vers `/devis-panneaux-solaires` avec UTMs.
- [ ] Le formulaire de devis fonctionne sur mobile (testé en conditions réelles).
- [ ] L'événement Pixel `Lead` s'allume bien dans le Meta Pixel Helper lors du test.
- [ ] Le budget est fixé au niveau Ad Set (ABO) pour les premiers tests, ou Campagne (CBO) si plus de 50 €/jour.
- [ ] Toutes les annonces sont d'abord créées en statut **PAUSED** pour relecture finale.
