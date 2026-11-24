-- Migration additive : sépare le dépôt du relevé (Jour 2) de la finalisation (Jour 3).
-- Sauvegardez la base avant exécution. Aucune ligne métier n'est supprimée ou réécrite.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.missions_controle') IS NULL THEN
    RAISE EXCEPTION 'La table public.missions_controle est absente. Appliquez d’abord les migrations de planification existantes.';
  END IF;
  ALTER TABLE public.missions_controle
    DROP CONSTRAINT IF EXISTS missions_controle_statut_check;
  ALTER TABLE public.missions_controle
    ADD CONSTRAINT missions_controle_statut_check
    CHECK (statut IN (
      'EN_ATTENTE', 'PLANIFIEE', 'EN_COURS', 'A_CONTROLER',
      'TERMINEE', 'A_REPROGRAMMER', 'ANNULEE'
    ));
END $$;
COMMIT;
