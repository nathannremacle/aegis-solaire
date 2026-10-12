# État du Site Aegis Solaire & Reste à Faire (Avant Lancement Publicitaire)

> **Date de mise à jour** : Octobre 2026  
> **Exploitant & Éditeur légal** : **INIT42** (Nathan Remacle, Personne physique)  
> **Identifiants officiels** : BCE `1039.899.980` · TVA `BE 1039.899.980` · Siège d'exploitation : Liège, Belgique  
> **Compte bancaire professionnel** : IBAN `BE84 0020 3534 7259` · BIC `GEBABEBB`  

---

## 1. Bilan d'Exécution de l'Audit Global (`docs/AUDIT-GLOBAL-SITE.md`)

Le plan d'audit global a été **100% exécuté et validé**. Les 16 constats identifiés ont été traités dans le code :

| # | Domaine | Problème initial | Statut actuel & Solution appliquée |
|---|---|---|---|
| **1** | Sécurité API | Injection gratuite de 100 crédits via `/api/payments/revolut` | ✅ **Résolu** : Endpoint neutralisé (503). Flux de commande sur facture pro INIT42 par virement bancaire actif (`/api/partners/credits/order`). |
| **2** | RGPD / Données | Inscrits au webinaire mis en vente sur la marketplace | ✅ **Résolu** : `marketplace_status = 'rejected'` forcé dès l'insertion API webinaire. |
| **3** | Métier / Promesse | Leads vendus sans contrôle ni revue qualité préalable | ✅ **Résolu** : Tous les leads arrivent en `pending_review`. Panneau admin doté du contrôle explicite et validation vers `available`. |
| **4** | Légal / RGPD | « Nous ne vendons jamais vos données » mensonger | ✅ **Résolu** : Politique de confidentialité clarifiée (transmission à 1 partenaire en B2B et jusqu'à 3 en B2C). |
| **5** | Légal Belge | Mentions légales sans BCE, TVA ni forme juridique | ✅ **Résolu** : INIT42 (Nathan Remacle, PP), BCE `1039.899.980`, TVA `BE1039899980`, NACEBEL, juridiction Liège. |
| **6** | Pratiques déloyales | 12 faux témoignages nominatifs avec photos IA et compteurs inventés | ✅ **Résolu** : Suppression des faux avis ; remplacement par 3 modélisations types indicatives (Liège 2 000 m², Brabant wallon 3 000 m², Hainaut 5 000 m²) avec hypothèses transparentes. |
| **7** | Calculs solaires | TRI bridé artificiellement (5,2-6,9 ans) et prime B2C fictive (300 €) | ✅ **Résolu** : `lib/solar-assumptions.ts` avec rendement réaliste de 930 kWh/kWc/an, zéro bridage et suppression de la prime inexistante. |
| **8** | Consentement RGPD | Consentement marketing obligatoire pour recevoir l'estimation | ✅ **Résolu** : 2 cases à cocher séparées (mise en relation obligatoire, actualités/newsletter optionnelle). |
| **9** | Tracking Ads | Aucun pixel publicitaire ni tag de conversion configuré | ✅ **Résolu** : Composant `components/analytics/ad-tracking.tsx` (Meta Pixel `fbq('track', 'Lead')`, Google Ads conversion, GTM). |
| **10** | Build & Code | Build cassé, `ignoreBuildErrors: true` et 21 erreurs TypeScript | ✅ **Résolu** : 0 erreur TS, `ignoreBuildErrors` supprimé, compilation Next.js 16 propre (45 routes générées avec succès). |
| **11** | CSP / Vidéo | Player vidéo webinaire bloqué par la Content Security Policy | ✅ **Résolu** : `youtube-nocookie.com`, `youtube.com`, `vimeo.com`, `calendly.com` autorisés dans `middleware.ts`. |
| **12** | SEO / Canonical | Canonical forcé vers la racine sur toutes les pages | ✅ **Résolu** : Balises canoniques individuelles sur chaque route publique. |
| **13** | UX Formulaire | « Mur rouge » d'erreurs avant la saisie à l'étape 5 B2B | ✅ **Résolu** : Validation affichée uniquement après interaction utilisateur (`touched`) ou tentative de soumission. |
| **14** | UX Mobile | Compteur `AnimatedCounter` bloqué à « - 0 € » sur mobile | ✅ **Résolu** : Marge d'intersection 0px et timer de secours automatique. |
| **15** | Navigation / Erreurs | Page 404 brute et ancres relatives cassées depuis les sous-pages | ✅ **Résolu** : Pages `not-found.tsx` et `error.tsx` personnalisées ; ancres absolues (`/#preuve`, `/#simulator`) dans le footer. |
| **16** | Délivrabilité Email | Absence de récapitulatif prospect et sender Resend non vérifié | ✅ **Résolu** : Email récapitulatif prospect automatique (`lib/prospect-confirmation-email.ts`) et replyTo `contact@aegissolaire.com`. |

---

## 2. État des Lieux Spécifique : Marketplace & Portail Installateurs

La Marketplace comporte deux volets distincts :

### A. La Vitrine Publique Partenaires (`/partenaires`)
- **Ce qui a été fait** :
  - **Refonte UI/UX complète** : Alignement sur la charte haut de gamme du site (titres percutants, typographie soignée).
  - **Double CTA stratégique** : 
    1. Bouton tactile 3D « Postuler au réseau (Gratuit) » renvoyant au formulaire.
    2. Bouton direct « Déjà partenaire ? Se connecter » menant à `/partenaires/login`.
  - **Grille de modalités clarifiée** : Mise en avant de l'exclusivité B2B (1 seul acheteur dès 5 crédits) et du comparatif B2C équitable (max 3 installateurs dès 2 crédits).
  - **Parcours en 3 étapes explicite** : Inscription & vérification RESCERT sous 48h → Recharge crédits sur facture → Live feed & alertes par e-mail.
  - **Formulaire d'inscription 4 étapes modernisé** : Validation des numéros BCE / KBO belges, certification RESCERT obligatoire, boutons tactiles 3D sans friction.

### B. Le Portail Installateur Privé (`/partenaires/dashboard` & `/credits`)
- **Ce qui a été fait** :
  - **Thème clair institutionnel moderne** (`bg-slate-50`) remplaçant les fonds sombres.
  - **Bandeau KPI en temps réel** : Total leads, puissance cumulée (kWc), économies réseau générées (€), décompte B2B/B2C.
  - **Système de slots visuel pour le B2C** : Barre de progression animée indiquant le nombre de places restantes (ex: 2/3, 1/3, complet).
  - **Déblocage sécurisé par RPC Supabase** : Déduction des crédits, déverrouillage accordéon avec coordonnées complètes (téléphone, e-mail, TVA, lien Google Maps direct).
  - **Boutique de crédits sur facture pro** (`/partenaires/dashboard/credits`) : Packs 10, 50, 100 crédits avec génération de bon de commande officiel INIT42 par virement bancaire.
  - **Synchronisation Admin complète** : Tout lead validé dans l'admin passe automatiquement à l'état `available` et s'affiche instantanément sur le Live Feed.

---

## 3. Ce Qu'il Reste à Faire Avant le Lancement Publicitaire

Le code et le design sont prêts pour la production. Voici la checklist opérationnelle et technique avant d'ouvrir les vannes publicitaires :

### 1. Hébergement & Base de Données (Priorité Immédiate)
- [ ] **Débloquer le projet Supabase** :  
  En local, le projet Supabase distant gratuit s'est mis en pause automatique d'inactivité (*paused*). Se connecter sur le dashboard Supabase (`supabase.com`) et cliquer sur **« Restore project »**.
- [ ] **Exécuter les dernières migrations SQL** (si non encore passées en base) :
  - `scripts/020_marketplace_lead_governance.sql` (valeur par défaut `pending_review` et rejet webinaire).
  - `scripts/021_add_newsletter_consent.sql` (séparation du consentement newsletter).

### 2. Configuration des Tags Publicitaires (Variables d'environnement Vercel)
- [ ] **Meta Pixel (Facebook / Instagram Ads)** :  
  Créer le pixel dans Meta Business Suite et renseigner `NEXT_PUBLIC_META_PIXEL_ID` dans les variables de projet Vercel et `.env.local`.
- [ ] **Google Ads** :  
  Créer l'action de conversion « Lead » dans Google Ads et renseigner `NEXT_PUBLIC_GOOGLE_ADS_ID` (format `AW-XXXXXXXXX`).
- [ ] **Google Tag Manager** (optionnel si utilisé) :  
  Renseigner `NEXT_PUBLIC_GTM_ID`.

### 3. Délivrabilité des E-mails Transactionnels (Resend & DNS)
- [ ] **Vérifier le domaine `aegissolaire.com` dans Resend** :  
  Ajouter les enregistrements DKIM / SPF fournis par Resend dans la zone DNS (chez Infomaniak) pour pouvoir émettre directement depuis `contact@aegissolaire.com` avec une délivrabilité maximale (0 spam).
- [ ] **Variable `RESEND_API_KEY`** :  
  Vérifier que la clé API de production est bien injectée dans les variables d'environnement Vercel.

### 4. Recrutement des Premiers Installateurs Pilotes
- [ ] Pour que le lancement de publicités B2C et B2B soit rentable dès le jour 1, inviter 2 à 3 installateurs RESCERT partenaires par province (Liège, Namur, Hainaut, Brabant wallon) à créer leur compte et leur attribuer un pack de crédits découverte.
