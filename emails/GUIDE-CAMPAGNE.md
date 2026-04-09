# 📧 Guide de Campagne Outreach — Aegis Solaire

## Ta situation

- ✅ Adresse mail `nathan@aegissolaire.com` opérationnelle
- ✅ 5 templates HTML professionnels créés (dans `/emails/outreach/`)
- ✅ CGV refondues pour le modèle marketplace
- ✅ Build du site validé

---

## 🎯 Étape 1 : Identifier tes cibles (c'est TOI qui fais ça)

Tu dois trouver les **contacts nominatifs** des installateurs et media buyers. Voici les entreprises prioritaires :

### Installateurs RESCERT Wallonie (supply)

| # | Entreprise | Province | Ce que tu cherches |
|---|-----------|----------|-------------------|
| 1 | Coretec Energy | Namur | Prénom + Nom du dirigeant/commercial |
| 2 | Energreen | Hainaut | Prénom + Nom |
| 3 | Enersol | Liège | Prénom + Nom |
| 4 | Modulo Solaire | Luxembourg | Prénom + Nom |
| 5 | Sun4Business | Brabant Wallon | Prénom + Nom |
| 6 | IRISOLARIS | Namur | Prénom + Nom |
| 7 | Dauvister | Liège | Prénom + Nom |
| 8 | Perpetum Energy | Hainaut | Prénom + Nom |
| 9 | Green Energy Park | Liège | Prénom + Nom |
| 10 | MiWatt | Brabant Wallon | Prénom + Nom |

### Media Buyers / Agences Lead Gen (demand)

| # | Agence | Ce que tu cherches |
|---|--------|-------------------|
| 1 | Sodigix | Prénom + Nom du responsable |
| 2 | Connexion Agency | Prénom + Nom |
| 3 | Weeb Agency | Prénom + Nom |
| 4 | Freelances sur Malt.be | Chercher "lead generation solaire" |
| 5 | Freelances sur Sortlist | Chercher "acquisition digitale" |

### Où chercher les contacts

1. **Site web** de l'entreprise → page "Équipe", "About", "Contact"
2. **LinkedIn** → chercher l'entreprise → onglet "Personnes" → trouver le dirigeant ou commercial
3. **Google** → `"Coretec Energy" + "directeur" OR "gérant"` 
4. **Hunter.io** (gratuit 25 recherches/mois) → entre le domaine, il te donne les emails trouvés

> ⚠️ **IMPORTANT** : Évite les `info@` et `contact@`. Un email nominatif (prenom@entreprise.be) a 3x plus de chances d'être lu.

---

## 🎯 Étape 2 : Tu me donnes les infos, je fais le reste

Une fois que tu as trouvé tes contacts, **envoie-moi un message comme celui-ci** :

```
Génère les emails personnalisés pour :

INSTALLATEURS :
1. Marc Dupont — Coretec Energy — marc.dupont@coretec-energy.be — Namur
2. Sophie Martin — Energreen — s.martin@energreen.be — Hainaut
3. ...

MEDIA BUYERS :
1. Benjamin Haddad — Freelance — benjamin@haddad.be
2. ...
```

**Ce que je ferai pour toi :**
- ✅ Je personnalise chaque template HTML avec le bon prénom, entreprise, ville
- ✅ Je te rédige l'objet du mail optimisé pour chaque destinataire
- ✅ Je crée des fichiers HTML individuels prêts à l'emploi
- ✅ Je te donne les instructions exactes pour chaque envoi

---

## 🎯 Étape 3 : Comment envoyer (copier-coller Gmail)

Pour chaque email personnalisé :

1. **Ouvre** le fichier `.html` dans ton navigateur (double-clic dessus)
2. **Sélectionne tout** le contenu de la page : `Ctrl + A`
3. **Copie** : `Ctrl + C`
4. **Va dans Gmail** → clic sur "Nouveau message"
5. **Colle** dans le corps du message : `Ctrl + V`
   → Le formatage HTML (logo, boutons, couleurs) est automatiquement préservé
6. **Ajoute l'objet** que je t'aurai fourni
7. **Vérifie** que le contenu est correct (prénom, entreprise)
8. **Envoie** ✉️

> 💡 **Astuce** : Avant d'envoyer à de vrais prospects, fais un test en t'envoyant l'email à toi-même sur une adresse Gmail perso pour vérifier le rendu.

---

## 📅 Planning d'envoi recommandé

### Semaine 1

| Jour | Quoi | Combien |
|------|------|---------|
| **Mardi 9h** | Email #1 (premier contact) aux 5-10 premiers installateurs | 5-10 |
| **Vendredi 9h** | Email #2 (relance PACE 2030) aux mêmes | 5-10 |

### Semaine 2

| Jour | Quoi | Combien |
|------|------|---------|
| **Mardi 9h** | Email #3 (dernier rappel) aux installateurs sem.1 | 5-10 |
| **Mercredi 9h** | Email #1 aux installateurs suivants (11-20) | 10 |
| **Mercredi 10h** | Email #1 aux media buyers (1-5) | 5 |

### Règles d'or

- **Max 10-15 emails/jour** la première semaine (warm-up du domaine)
- **Jamais le lundi matin** (inbox saturée)
- **Meilleur créneau** : mardi-mercredi, entre 9h et 10h30
- **Espacer de 2-3 min** entre chaque envoi (pas d'envoi en rafale)

---

## 🛡️ Checklist délivrabilité

Avant ton premier envoi, vérifie ces points :

- [ ] **SPF** configuré sur aegissolaire.com (Google Workspace Admin)
- [ ] **DKIM** activé (Google Workspace Admin → Gmail → Authentification)
- [ ] **DMARC** en place (enregistrement DNS TXT)
- [ ] **Email test** envoyé à ta propre adresse Gmail perso → vérifier qu'il arrive en inbox (pas spam)
- [ ] **Score spam** testé sur [mail-tester.com](https://www.mail-tester.com) (viser ≥ 8/10)

---

## 📁 Fichiers créés

```
emails/
└── outreach/
    ├── email-installateurs-1.html   ← Premier contact installateurs
    ├── email-installateurs-2.html   ← Relance J+3 (urgence PACE 2030)
    ├── email-installateurs-3.html   ← Dernier rappel J+7
    ├── email-mediabuyers-1.html     ← Premier contact media buyers
    └── email-mediabuyers-2.html     ← Relance J+4 (comparaison CPL)
```

Page CGV mise à jour : `app/cgv/page.tsx` (14 sections couvrant le modèle marketplace)

---

## 🚀 En résumé : ton plan d'action

1. **Maintenant** → Vérifie tes DNS (SPF/DKIM/DMARC) + fais un envoi test
2. **Ce soir / demain** → Recherche les 10 premiers contacts installateurs (LinkedIn + sites)
3. **Quand tu as les contacts** → Envoie-les moi ici, je personnalise tout
4. **Mardi/mercredi prochain** → Tu envoies le batch 1 (5-10 emails)
5. **J+3** → Relance (email #2) pour ceux qui n'ont pas répondu
6. **J+7** → Dernier rappel (email #3) pour les non-répondants
