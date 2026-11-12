# RÈGLE STRICTE D'INTÉGRITÉ DES DONNÉES MARKETPLACE (AEGIS SOLAIRE)

Cette règle s'applique à l'ensemble du projet, des scripts et de la base de données sans aucune exception.

## 1. INTERDICTION ABSOLUE DE LEADS FACTICES OU NON ACHETÉS SUR LA MARKETPLACE
- Il est **STRICTEMENT INTERDIT** d'insérer dans la table `leads` (en particulier avec `marketplace_status = 'available'`) tout dossier dont les coordonnées complètes (nom, téléphone, e-mail) ne sont pas **réelles, vérifiées et prêtes à être livrées**.
- Il est **STRICTEMENT INTERDIT** d'utiliser des numéros ou e-mails fictifs/placeholders (ex : `+32470000000`, `*.prospect@aegissolaire.com`) dans la base de données de production.

## 2. SÉPARATION STRICTE VITRINE D'AMORÇAGE VS BASE DE PRODUCTION
- Les dossiers d'amorçage provenant de sources externes non encore achetées (ex : `panneaux-solaires24.be`) doivent rester **exclusivement** dans la documentation (`docs/`) et les scripts d'e-mailing.
- Un dossier externe ne peut être créé dans `leads` (avec `marketplace_status = 'available'`) **qu'après achat effectif à la source et vérification des coordonnées réelles du prospect**.

