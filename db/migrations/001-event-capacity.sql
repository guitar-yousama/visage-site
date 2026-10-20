-- Additive migration: existing reservations and settings are preserved.
BEGIN;
ALTER TABLE public.ticket_events ADD COLUMN capacity integer;
ALTER TABLE public.ticket_events ADD CONSTRAINT ticket_events_capacity_check
 CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 1000000);
CREATE INDEX ticket_reservations_capacity ON public.ticket_reservations(event_id)
 INCLUDE (quantity) WHERE deleted_at IS NULL AND status IN ('pending','confirmed');
COMMIT;
