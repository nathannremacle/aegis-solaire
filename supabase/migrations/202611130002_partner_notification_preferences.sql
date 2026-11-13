-- Migration 202611130002 : Préférences granulaires de notifications e-mail des installateurs partenaires
-- Permet à un partenaire de choisir entre toutes les alertes, nouveaux chantiers uniquement (0 relance), ou désactivation complète.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_relances_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.partners.email_notifications_enabled IS 'Active ou met en pause toutes les alertes e-mail de leads pour ce partenaire.';
COMMENT ON COLUMN public.partners.email_relances_enabled IS 'Active ou coupe les relances automatiques (Vague 2 / Vague 3) tout en conservant les nouveaux chantiers si email_notifications_enabled est true.';

