# Aegis Solaire — Guide de design

Version 1.0 · 17 novembre 2026

## 1. Origine et utilisation

Ce document formalise après conception la direction visuelle des maquettes et du dernier aperçu HTML du mail installateur Aegis Solaire. Il sert de référence pour concevoir d’autres e-mails et des pages du site.

Les couleurs et les dimensions du mail proviennent de cet aperçu. Les règles propres aux pages web, aux formulaires et aux états interactifs constituent des extensions proposées. Les valeurs sont des points de départ à adapter au contenu et au contexte de lecture.

Utiliser ce fichier comme brief commun pour les designers, développeurs et assistants de génération. Pour chaque nouvel écran, préciser son destinataire, l’information principale, l’action attendue et les données réellement disponibles.

## 2. Intention visuelle

Créer une interface professionnelle, calme et concrète. L’impression de qualité repose sur la lisibilité, l’alignement et la précision des informations.

- Une surface blanche sur un fond gris bleuté très clair.
- Un bleu marine profond pour les titres, les chiffres importants et l’action principale.
- Une typographie sans empattement pour l’interface, associée au logo officiel.
- Des contours fins et des espaces réguliers pour structurer la lecture.
- Un accent doré ponctuel pour attirer l’attention sur une consigne du prospect.
- Des photographies réelles, utiles pour comprendre le projet.

Le lecteur doit identifier rapidement le sujet, comprendre ce qui le concerne et repérer l’action suivante. Chaque titre, badge ou encadré doit contribuer à l’une de ces tâches.

## 3. Hiérarchie de l’information

### E-mail de nouveau dossier

| Ordre | Contenu | Fonction |
| --- | --- | --- |
| 1 | Logo et référence discrète | Identifier l’expéditeur et le dossier |
| 2 | Nature du message, localité, type de bien | Comprendre immédiatement le projet |
| 3 | Disponibilité, puissance et devis estimés | Évaluer l’opportunité |
| 4 | Nom du prospect, préférence de contact, coordonnées masquées | Comprendre à qui et comment s’adresser |
| 5 | Prix, crédits disponibles et accès au dossier | Prendre une décision en connaissance du coût |
| 6 | Photo éventuelle et détails techniques | Approfondir l’évaluation |
| 7 | Assistance, préférences de notification et mentions applicables | Retrouver les services et informations complémentaires |

Le titre porte l’information qui distingue ce dossier des autres, par exemple « 4300 Bovenistier ». L’intitulé « Nouveau dossier photovoltaïque » devient une courte ligne de contexte au-dessus.

Pour un autre message, réordonner les blocs en fonction de sa finalité. Une confirmation de paiement commence par le résultat du paiement. Une demande de document place le document attendu et son échéance avant les détails du dossier.

Conserver un seul titre principal et une action visuellement dominante par décision. Les informations de coût ou de conséquence restent proches du bouton concerné.

## 4. Identité et couleurs

### Logo

Employer le fichier officiel fourni par Aegis Solaire, avec son bouclier, son soleil et ses panneaux. Ses couleurs et proportions font référence. Les reproductions présentes dans les maquettes et le logo de remplacement de l’aperçu HTML servent uniquement à illustrer la composition.

Dans un e-mail, viser une largeur visible de 125 à 140 px, avec une hauteur proportionnelle. Vérifier les marges transparentes du fichier pour obtenir la bonne taille visuelle. Prévoir environ 12 px de dégagement autour du signe. Le placer sur fond blanc avec le texte alternatif « Aegis Solaire ».

### Palette de l’interface

| Variable | Valeur | Usage |
| --- | --- | --- |
| `--color-canvas` | `#EEF2F4` | Fond extérieur |
| `--color-surface` | `#FFFFFF` | Contenu principal |
| `--color-surface-subtle` | `#F6F8FA` | Pied de mail, zones secondaires |
| `--color-summary` | `#F0F5F8` | Synthèse chiffrée |
| `--color-ink` | `#142D42` | Titres, valeurs, bouton principal |
| `--color-muted` | `#4D6374` | Libellés et texte secondaire |
| `--color-context` | `#305A76` | Ligne de contexte |
| `--color-link` | `#194767` | Liens textuels |
| `--color-border` | `#DCE5EB` | Contours des composants |
| `--color-divider` | `#E6EDF1` | Séparateurs internes |
| `--color-availability-bg` | `#E8F2ED` | Fond d’une disponibilité positive |
| `--color-availability-text` | `#1D5D45` | Texte du statut disponible |
| `--color-preference-bg` | `#FFF5DF` | Fond de la préférence de contact |
| `--color-preference-accent` | `#D69729` | Filet de la préférence |
| `--color-preference-label` | `#684916` | Libellé sur fond crème |
| `--color-focus` | `#935800` | Contour du focus clavier |

Extensions proposées pour le site et les messages de statut.

| Variable | Valeur | Usage |
| --- | --- | --- |
| `--color-primary-hover` | `#203F57` | Survol du bouton principal |
| `--color-danger-bg` | `#FFF1F0` | Fond d’une erreur |
| `--color-danger-text` | `#9A2F2B` | Message d’erreur et correction attendue |
| `--color-input-border` | `#7E919F` | Délimitation visible d’un champ |

Les fonds colorés sont localisés sur les éléments qui en ont besoin. Le vert accompagne un statut favorable confirmé par les données. Le crème signale ici une consigne du prospect. Le texte indique toujours le sens de la couleur.

Les surfaces de base sont unies. La séparation des blocs repose sur l’espacement, les filets et de légères variations de fond. Réserver une ombre légère aux éléments superposés du site, tels qu’un menu ou une fenêtre de dialogue.

## 5. Typographie

Pour les e-mails, employer `Arial, Helvetica, sans-serif`. Pour une nouvelle interface web, employer `Inter, Arial, sans-serif`, en conservant la police du projet lorsqu’une typographie est déjà établie. Le lettrage du logo reste inclus dans son fichier graphique.

| Rôle | E-mail bureau | E-mail mobile | Page web |
| --- | --- | --- | --- |
| Titre principal | 32 px / 1,12 · 700 | 27 px / 1,15 · 700 | 32 à 40 px / 1,15 · 700 |
| Titre de section | 18 px / 1,25 · 700 | 18 px / 1,25 · 700 | 20 à 24 px / 1,3 · 600–700 |
| Chiffre principal | 22 px / 1,15 · 700 | 18 à 22 px / 1,2 · 700 | 24 à 28 px / 1,2 · 700 |
| Corps de texte | 15 px / 1,5 · 400 | 15 à 16 px / 1,5 · 400 | 16 px / 1,5 · 400 |
| Libellé secondaire | 13 px / 1,4 · 400 | 13 px / 1,4 · 400 | 14 px / 1,4 · 400 |
| Bouton | 15 px / 1,35 · 700 | 15 px / 1,35 · 700 | 15 à 16 px / 1,35 · 600 |
| Référence et pied de page | 12 px / 1,5 · 400 | 12 px / 1,5 · 400 | 12 à 13 px / 1,5 · 400 |

Aligner à gauche les titres, paragraphes, libellés et valeurs des fiches descriptives. Centrer le texte des boutons. Aligner à droite les colonnes numériques d’un tableau destiné à comparer des montants.

Utiliser une graisse forte pour les valeurs et les actions importantes. Les libellés ont une graisse normale. Un léger resserrement des lettres, de `-0.02em` à `-0.035em`, convient aux grands titres. Garder l’espacement normal pour les petits textes.

Employer la casse de phrase. Réserver les capitales aux acronymes et au logo. Écrire les nombres en français, par exemple `6,1 kWc`, `29,50 € HT`, `6 000 kWh/an`. Associer visuellement les unités à leur valeur et autoriser le retour à la ligne entre les groupes complets lorsque la place manque.

## 6. Grille, espacement et formes

| Propriété | Valeur de référence |
| --- | --- |
| Largeur maximale du mail | 640 px |
| Largeur du contenu du mail sur mobile | 100 % de l’espace disponible |
| Marge intérieure horizontale bureau | 28 px |
| Marge intérieure horizontale mobile | 16 px |
| Espacement entre grandes sections | 16 à 24 px |
| Espacement entre éléments liés | 4 à 8 px |
| Marge intérieure d’une carte | 12 à 16 px |
| Rayon du conteneur principal | 14 px |
| Rayon d’une carte ou d’une image | 8 px |
| Rayon d’un bouton | 6 px |
| Rayon d’un badge | 5 px |
| Épaisseur des filets | 1 px |
| Épaisseur de l’accent de préférence | 3 px |

Privilégier l’échelle d’espacement `4, 8, 12, 16, 24, 32, 48 px`. Les 28 px de marge du mail sont une valeur propre à sa composition.

Faire partager les mêmes bords gauche et droit aux titres, cartes, tableaux et boutons. Regrouper les informations liées dans une seule carte. Un simple filet suffit entre deux sous-ensembles du même sujet.

L’espace vide donne un rythme à la lecture. Une section courte garde sa hauteur naturelle. Les blocs s’agrandissent lorsque leur contenu le nécessite.

## 7. Composants de référence

### En-tête

Placer le logo à gauche et une référence courte à droite. La référence utilise 12 px et une couleur secondaire. Un filet sépare l’en-tête du contenu. Sur une page web, conserver cet équilibre entre identité et navigation utile.

### Résumé du projet

Associer une ligne de contexte, un titre, une courte description et un statut de disponibilité. Présenter deux chiffres clés dans une bande gris bleuté. Chaque chiffre possède son propre libellé.

Exemple de paire pour un installateur, « Puissance estimée — 6,1 kWc » et « Devis estimé — 5 300 à 6 250 € HT ». Garder le caractère estimatif à proximité des valeurs.

### Bloc prospect

Le titre compact « Prospect · Rousseau » réunit le rôle et le nom. Sous ce titre, la préférence de contact se lit sur deux lignes.

> Premier contact souhaité par le prospect  
> **Par e-mail ou SMS**

Le fond crème et le filet doré soulignent la consigne. Cette formulation attribue explicitement le choix au prospect et précise qu’il concerne le premier contact.

Sous la préférence, placer les indicateurs de coordonnées sur deux colonnes. Associer une icône de combiné au téléphone et une enveloppe à l’e-mail. Taille des icônes de 14 à 16 px, trait fin, même couleur que le libellé. Conserver les libellés visibles.

Exemples fictifs d’affichage masqué, `04•• •• •• ••` et `••••@••••.••`. En production, construire le masque à partir des règles de visibilité du dossier. Le préfixe visible dépend de la donnée disponible. Afficher « vérifié » seulement lorsque l’état de vérification correspondant le permet.

### Bloc d’accès et d’action

Regrouper le prix du déblocage, son équivalent en crédits et le solde de l’installateur. À côté, placer le bouton marine « Consulter le dossier ». Le lien secondaire « Débloquer à l’unité » se trouve immédiatement dessous.

Sur mobile, empiler prix puis bouton pleine largeur puis lien secondaire. Viser une hauteur de bouton de 44 à 48 px. Une bordure fine et un rayon de 6 px suffisent à le rendre identifiable.

Le libellé décrit l’effet réel de l’action. « Consulter le dossier » ouvre la fiche. Un bouton qui lance un paiement ou consomme des crédits précise le montant ou le coût au moment de la confirmation. Adapter les actions au solde et à l’accès déjà acquis.

### Détails avec photo

Sur bureau, réserver environ 42 % de la largeur au visuel et le reste aux caractéristiques. Employer une image réelle avec un cadrage qui conserve les éléments utiles à l’évaluation. Le ratio de départ est de 3:2, à ajuster si la toiture ou la façade deviennent difficiles à examiner.

Le libellé sous l’image décrit sa source, par exemple « Aperçu Street View » ou « Photo du bâtiment », selon le visuel utilisé. Une photo générique d’illustration porte un libellé explicite.

Aligner le haut du visuel avec celui des données. Séparer consommation et facture en deux lignes lorsque cela facilite la lecture. Sur mobile, la photo précède le tableau sur toute la largeur.

### Détails sans photo

Le tableau de caractéristiques occupe toute la largeur. La section garde sa hauteur naturelle. Les libellés se trouvent à gauche et les valeurs à droite dans une seconde colonne alignée à gauche. Les lignes sont séparées par des filets légers.

### Pied de message

Employer un fond gris très clair et un texte secondaire de 12 à 13 px. Regrouper l’assistance et la gestion des notifications, puis les mentions de l’expéditeur et les conditions applicables.

Le pied simplifié des maquettes sert de référence visuelle. Le contenu du template d’envoi doit intégrer les liens de désinscription, les mentions et les conditions nécessaires à son contexte.

## 8. Données variables et états

| Situation | Adaptation attendue |
| --- | --- |
| Photo absente ou inutilisable | Présenter les caractéristiques sur toute la largeur |
| Préférence de contact absente | Retirer l’encadré de préférence |
| Nom de famille absent | Employer un titre descriptif tel que « Prospect propriétaire occupant », si cette information est connue |
| Vérification inconnue | Employer un libellé factuel tel que « Téléphone renseigné », si le numéro est présent |
| Valeur facultative absente | Omettre sa ligne ou indiquer « À préciser » si cette donnée est essentielle à la décision |
| Une seule place réellement disponible | Afficher « 1 place disponible » |
| Dossier complet ou clôturé | Présenter le statut et une action adaptée, par exemple « Voir les autres dossiers » |
| Coordonnées déjà débloquées | Afficher les coordonnées autorisées et les actions de contact pertinentes |
| Solde insuffisant | Présenter le coût et les moyens d’accès disponibles |
| Texte ou localité longue | Autoriser le retour à la ligne et augmenter la hauteur du bloc |

Dans un e-mail, le nombre de places décrit la situation au moment de l’envoi. Le dossier ouvert par le lien fournit l’état actualisé. Employer un libellé neutre pour une relance lorsque la disponibilité n’a pas été recalculée.

## 9. Réutilisation pour d’autres messages

| Usage | Information dominante | Action principale possible | Blocs complémentaires |
| --- | --- | --- | --- |
| Nouveau dossier installateur | Localité et caractéristiques clés | Consulter le dossier | Prospect, prix, photo, détails |
| Relance installateur | Dossier concerné et évolution réelle | Revoir le dossier | Résumé raccourci, disponibilité actualisée |
| Coordonnées débloquées | Confirmation d’accès et prospect | Ouvrir le dossier | Coordonnées, préférence, coût confirmé |
| Paiement confirmé | Montant et objet du paiement | Voir le reçu | Référence et accès au dossier |
| Demande reçue côté particulier | Confirmation et prochaine étape | Suivre ma demande | Récapitulatif du projet, assistance |
| Document manquant | Pièce attendue et raison de la demande | Ajouter le document | Dossier concerné, aide, échéance réelle |

Sélectionner les blocs qui servent le message. Réutiliser leur apparence, leur vocabulaire et leur comportement. Les valeurs commerciales, badges et indicateurs correspondent toujours au dossier et au destinataire.

## 10. Extension aux pages web

### Conteneurs

Pour une page de dossier, partir d’un conteneur de 1 120 à 1 200 px, centré, avec 24 à 32 px de marge intérieure sur bureau et 16 px sur mobile. La colonne principale accueille les détails et les photos. Une colonne de 300 à 340 px peut regrouper le prix et l’action. Prévoir environ 24 px entre les colonnes.

Quand le contenu devient trop étroit, empiler les colonnes. Un point de départ de 900 px convient pour cette mise en page, puis ajuster après examen avec les contenus réels. Les petits composants à deux colonnes peuvent s’empiler plus tôt, autour de 520 px.

Pour une confirmation ou un formulaire simple, utiliser une colonne centrale de 640 à 720 px. Adapter la largeur au besoin de lecture et au nombre de champs.

### Formulaires

Placer un libellé permanent au-dessus de chaque champ. Employer un fond blanc, une bordure visible, un rayon de 6 px et une hauteur cible de 44 à 48 px. Le texte d’aide explique le format ou la raison d’une demande d’information.

Près du champ concerné, une erreur indique le problème et la correction attendue. Une validation confirme l’action avec un message concret. Regrouper les champs qui concernent le même sujet et présenter les étapes dans l’ordre où l’utilisateur peut y répondre.

### Navigation et interactions

Limiter la navigation visible aux destinations utiles à l’écran. Identifier la page active par un traitement de fond et un libellé clair. Sous-ligner les liens inclus dans un texte.

Le survol d’un bouton assombrit ou éclaircit légèrement son fond. Le focus clavier reçoit un contour visible de 2 px avec un décalage de 3 px. Pendant une opération, un libellé tel que « Enregistrement… » explique l’état de l’action. Un message de résultat apparaît près de l’action effectuée.

## 11. Mise en œuvre des e-mails

Le HTML fourni dans la conversation est un aperçu navigateur. Les contrôles de chargement d’image et d’export appartiennent à l’outil d’aperçu.

Pour produire les messages d’envoi, utiliser une structure de présentation en tableaux, des styles essentiels en ligne et des dimensions explicites pour les images. Prévoir une version texte du message et des liens de destination réels. Les variables CSS du paragraphe suivant servent de référence pour le développement et doivent être résolues en valeurs dans le HTML d’envoi.

Conserver le texte, les prix, les statuts et les actions lisibles lorsque les images sont bloquées. Fournir des fichiers d’image hébergés pour le logo et les éventuelles icônes. Les informations de contact gardent leurs libellés textuels.

Vérifier les messages dans les clients de messagerie utilisés par les destinataires, avec une attention particulière aux affichages mobile, images bloquées et mode sombre. Ces vérifications restent à effectuer sur le template de production.

## 12. Variables de départ pour le site

```css
:root {
  --font-interface: Inter, Arial, sans-serif;
  --font-email: Arial, Helvetica, sans-serif;

  --color-canvas: #eef2f4;
  --color-surface: #ffffff;
  --color-surface-subtle: #f6f8fa;
  --color-summary: #f0f5f8;
  --color-ink: #142d42;
  --color-muted: #4d6374;
  --color-context: #305a76;
  --color-link: #194767;
  --color-border: #dce5eb;
  --color-divider: #e6edf1;
  --color-availability-bg: #e8f2ed;
  --color-availability-text: #1d5d45;
  --color-preference-bg: #fff5df;
  --color-preference-accent: #d69729;
  --color-preference-label: #684916;
  --color-focus: #935800;
  --color-primary-hover: #203f57;
  --color-danger-bg: #fff1f0;
  --color-danger-text: #9a2f2b;
  --color-input-border: #7e919f;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;

  --radius-badge: 5px;
  --radius-control: 6px;
  --radius-card: 8px;
  --radius-container: 14px;
  --width-email: 640px;
  --width-content: 1200px;
}
```

## 13. Revue d’un nouveau rendu

Avant livraison, parcourir l’écran dans l’ordre de lecture et vérifier les points suivants.

- Le sujet et l’action principale se repèrent dès le début.
- Le texte permet de comprendre le rôle de chaque valeur, statut et bouton.
- Le prix et la conséquence d’une action sont présentés à proximité.
- La préférence de contact est explicitement attribuée au prospect.
- Le logo officiel est utilisé et les images correspondent à leur légende.
- Les versions avec et sans photo restent équilibrées.
- Les noms longs, données absentes et montants élevés tiennent dans les blocs.
- À 320, 375, 520 et 640 px, le mail garde une lecture fluide et un bouton accessible.
- Sur le site, vérifier aussi les largeurs de 900 et 1 200 px, le clavier et le zoom.
- Viser un contraste de 4,5:1 pour le texte courant et de 3:1 pour les grands textes. Vérifier chaque association de couleur réellement employée.
- Les statuts et erreurs restent compréhensibles par leur texte et leur forme.
- La version d’envoi contient ses liens, ses mentions et ses données définitives.

## 14. Brief réutilisable

> Concevoir [type d’e-mail ou de page] pour [destinataire] en appliquant le guide Aegis Solaire. L’objectif principal est [action attendue]. Employer une surface blanche sur fond gris bleuté, le bleu marine pour les titres et l’action principale, une typographie sobre et une hiérarchie lisible. Organiser les contenus selon leur importance pour cette décision. Utiliser les composants et les couleurs de ce guide, le logo officiel et les données fournies. Adapter la disposition aux petits écrans et aux informations manquantes. Prévoir la variante sans photo lorsqu’elle est pertinente. Vérifier les libellés, les unités, les coûts et les conséquences de chaque action. Livrer [format attendu] avec une liste concise des points restant à vérifier.
