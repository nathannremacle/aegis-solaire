🛠 STRUCTURE GLOBALE DU FORMULAIRE (UX/UI)
Format : Formulaire interactif type "Typeform", une question par écran pour maintenir l'attention.
Design : Épuré, couleurs Bleu Nuit et Or. Pas de distraction (menus cachés pendant la simulation).
Indicateur de progression : Une barre de progression visuelle en haut (ex: "Étape 1/5") pour réduire le taux d'abandon.

--------------------------------------------------------------------------------
ÉCRAN 1 : Le déclencheur (L'intention)
Titre : Quel est l'objectif principal de votre démarche aujourd'hui ? Sous-titre : Sélectionnez la priorité de votre entreprise.
Les choix (Boutons cliquables larges) :
🏛️ Mise en conformité légale (Loi APER / Décret Tertiaire)
💰 Réduction de la facture d'électricité (Autoconsommation)
🌍 Démarche RSE & Décarbonation
💶 Générer un nouveau revenu (Location de toiture/terrain)
💡 Pourquoi cette question ? Elle qualifie immédiatement la "douleur" du prospect. S'il clique sur "Mise en conformité", le commercial de l'installateur saura qu'il doit axer son discours sur le risque d'amende (jusqu'à 40 000 €/an pour les parkings
).

--------------------------------------------------------------------------------
ÉCRAN 2 : La qualification du gisement (Le Foncier)
Titre : Quel type de surface souhaitez-vous valoriser ? Sous-titre : Aegis Solaire accompagne exclusivement les projets d'envergure professionnelle.
Les choix :
🚗 Parking extérieur (Sélectionner la surface : < 1 500 m² / > 1 500 m²)
🏭 Toiture tertiaire ou industrielle (Sélectionner la surface : < 500 m² / 500 à 1000 m² / > 1000 m²)
🌾 Terrain nu ou Friche
💡 Pourquoi cette question ? C'est votre filtre anti-particuliers. Les seuils mentionnés ne sont pas choisis au hasard : la loi APER impose les ombrières pour les parkings de plus de 1 500 m²
, et le Décret Tertiaire vise les bâtiments de plus de 1 000 m²
. Si le prospect choisit une surface trop petite, il peut être disqualifié (ou revendu moins cher).

--------------------------------------------------------------------------------
ÉCRAN 3 : Le profil énergétique (Le besoin financier)
Titre : À combien s'élève votre facture annuelle d'électricité ? Sous-titre : Cette donnée nous permet de calculer votre potentiel d'autoconsommation.
Les choix (Boutons ou curseur / Range slider) :
Moins de 20 000 € / an
De 20 000 € à 50 000 € / an
De 50 000 € à 100 000 € / an
Plus de 100 000 € / an
💡 Pourquoi cette question ? Pour proposer un contrat PPA (Power Purchase Agreement - achat d'électricité à prix fixe sur 5 à 25 ans
), l'installateur a besoin de connaître la consommation du site. Un prospect avec une facture de 100 000 €/an est un "Hot Lead" extrêmement précieux.

--------------------------------------------------------------------------------
ÉCRAN 4 : La maturité du projet (Le Lead Scoring)
Titre : Sous quel délai souhaitez-vous concrétiser ce projet ? Sous-titre : L'étude de faisabilité et les raccordements peuvent prendre plusieurs mois.
Les choix :
🔥 Urgent (Moins de 3 mois) -> Lead très chaud (forte valeur de revente).
☀️ À moyen terme (3 à 6 mois) -> Lead standard.
❄️ Exploratoire (Plus de 6 mois) -> Lead à mettre en "Nurturing" (emails automatiques).
💡 Pourquoi cette question ? C'est ce qui justifie le prix de votre lead B2B (entre 40 € et 140 € l'unité
). Un installateur paiera le prix fort pour un projet > 1500m² urgent.

--------------------------------------------------------------------------------
ÉCRAN 5 : L'écran de transition (La Gamification)
Visuel : Un écran de chargement dynamique avec des animations fluides (Framer Motion). Texte défilant automatiquement (toutes les 1,5 secondes) :
Analyse du gisement solaire en cours...
Vérification des obligations réglementaires...
Calcul de l'éligibilité au financement Zéro CAPEX (Tiers-investissement)...
Estimation du Retour sur Investissement...
💡 Pourquoi cet écran ? C'est l'effet "Expert". Le prospect a l'impression qu'un algorithme puissant travaille pour lui. Cela augmente considérablement son désir de voir le résultat et le prépare psychologiquement à laisser ses coordonnées.

--------------------------------------------------------------------------------
ÉCRAN 6 : Le Gated Content & La Capture (Le Mur)
Visuel : Le résultat apparaît flouté ou partiellement caché en arrière-plan. Titre (au-dessus du flou) : Bonne nouvelle, votre site présente un fort potentiel de rentabilité ! Texte de teasing : Sur ce type de surface, le Retour sur Investissement moyen est estimé entre 8 et 12 ans
. Votre projet est également éligible à un financement intégral par un tiers-investisseur (Zéro avance de trésorerie)
.
Le Formulaire de Capture B2B (clair et structuré) : Découvrez votre rapport détaillé et chiffré. Où devons-nous vous l'envoyer ?
Prénom & Nom : (Champs texte classiques)
Fonction : (Menu déroulant : Dirigeant, DAF, Directeur RSE, Services Généraux, Autre)
Nom de l'entreprise : (Champ texte)
Email professionnel : (Validation stricte Zod : rejet des @gmail.com, @yahoo.fr, etc. "Veuillez entrer une adresse pro valide"
)
Téléphone direct : (Validation libphonenumber-js pour s'assurer que c'est un format français valide).
La conformité RGPD (Sous le bouton de validation) :
Checkbox (non pré-cochée) : "J'accepte d'être recontacté par Aegis Solaire et ses installateurs partenaires certifiés RGE pour évaluer mon projet."
Texte légal (en petit) : "Conformément au RGPD, vos données sont collectées sur la base de votre consentement pour traiter votre demande de simulation. Elles seront conservées pour une durée maximale de 3 ans après notre dernier contact
. Vous disposez d'un droit d'accès, de rectification et d'opposition immédiate à tout moment
."
Bouton d'Appel à l'Action (CTA - Couleur Or Solaire) : "Recevoir mon audit de rentabilité complet"

--------------------------------------------------------------------------------
ÉCRAN 7 : La page de remerciement (Thank You Page)
Titre : Félicitations ! Votre audit est en route vers votre boîte mail. Texte : Un expert en ingénierie financière partenaire d'Aegis Solaire va analyser vos données et vous contactera d'ici 24 à 48 heures pour vous présenter vos options de financement (PPA, Tiers-Investissement). Le petit plus : Proposer un bouton facultatif : "Prendre un rendez-vous téléphonique de 10 min dès maintenant" (lié à un outil comme Calendly), ce qui transforme le lead en "rendez-vous qualifié", que vous pouvez revendre encore plus cher.