-- Migration 025 : Rendre job_title optionnel (DROP NOT NULL) sur la table leads
--
-- Contexte :
-- Pour les leads B2C (particuliers, résidences unifamiliales), aucune fonction d'entreprise
-- n'est collectée. Cette migration aligne le schéma PostgreSQL avec la réalité B2C,
-- tout en conservant la rétrocompatibilité (valeur par défaut 'Particulier' côté API).

ALTER TABLE public.leads
  ALTER COLUMN job_title DROP NOT NULL;
