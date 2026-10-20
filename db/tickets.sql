-- Run once against a dedicated PostgreSQL database, using a migration/owner role.
-- The application role needs table CRUD + sequence usage, not schema/role creation.
BEGIN;
CREATE TABLE ticket_events (
 id uuid PRIMARY KEY, title text NOT NULL, starts_at timestamptz NOT NULL,
 venue text NOT NULL, price text NOT NULL, opens_at timestamptz NOT NULL,
 closes_at timestamptz NOT NULL, enabled boolean NOT NULL DEFAULT false,
 max_quantity integer NOT NULL DEFAULT 4 CHECK (max_quantity BETWEEN 1 AND 20),
 capacity integer CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 1000000),
 news_slug text UNIQUE, live_slug text UNIQUE, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK (opens_at < closes_at), CHECK (closes_at <= starts_at)
);
CREATE TABLE ticket_reservations (
 id uuid PRIMARY KEY, receipt text UNIQUE NOT NULL, event_id uuid NOT NULL REFERENCES ticket_events(id),
 event_title text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 name text NOT NULL, email text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 20),
 notes text NOT NULL DEFAULT '', consent_at timestamptz NOT NULL DEFAULT now(), consent_version text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled')),
 deleted_at timestamptz, version integer NOT NULL DEFAULT 1,
 request_key text UNIQUE NOT NULL, request_hash text NOT NULL
);
CREATE INDEX ticket_reservations_capacity ON ticket_reservations(event_id)
 INCLUDE (quantity) WHERE deleted_at IS NULL AND status IN ('pending','confirmed');
CREATE INDEX ticket_reservations_event_date ON ticket_reservations(event_id, created_at DESC);
CREATE TABLE ticket_mail_jobs (
 id uuid PRIMARY KEY, reservation_id uuid NOT NULL REFERENCES ticket_reservations(id),
 kind text NOT NULL, payload jsonb NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, claimed_at timestamptz, claim_token uuid, sent_at timestamptz,
 error_code text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ticket_mail_jobs_reservation ON ticket_mail_jobs(reservation_id);
CREATE TABLE ticket_sessions (
 token_hash text PRIMARY KEY, admin_id text NOT NULL, credential_hash text NOT NULL,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ticket_rate_limits (
 key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE ticket_audit (
 id bigserial PRIMARY KEY, admin_id text NOT NULL, action text NOT NULL,
 target_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
-- Deny direct access via Supabase/PostgREST if used. Connect via a private server DB role.
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_mail_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_audit ENABLE ROW LEVEL SECURITY;
COMMIT;
