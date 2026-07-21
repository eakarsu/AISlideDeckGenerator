BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS deck_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, owner_id TEXT NOT NULL, idempotency_key TEXT NOT NULL,
  title TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'draft', version INTEGER NOT NULL DEFAULT 1, brand_version TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}', evaluation JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id,idempotency_key), CHECK(stage IN ('draft','sources_ready','editing','render_queued','rendered','review','approved','published','exported','failed','corrected','deleted'))
);
CREATE INDEX IF NOT EXISTS deck_workflows_tenant_stage_idx ON deck_workflows(tenant_id,stage,updated_at DESC);
CREATE TABLE IF NOT EXISTS deck_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, workflow_id UUID NOT NULL REFERENCES deck_workflows(id),
  source_ref TEXT NOT NULL, source_version TEXT NOT NULL, checksum TEXT NOT NULL, media_type TEXT NOT NULL, rights_basis TEXT NOT NULL,
  consent_ref TEXT, license_expires_at TIMESTAMPTZ, editable_uri TEXT, metadata JSONB NOT NULL DEFAULT '{}', UNIQUE(tenant_id,source_ref,source_version,checksum)
);
CREATE TABLE IF NOT EXISTS deck_render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, workflow_id UUID NOT NULL REFERENCES deck_workflows(id),
  provider TEXT NOT NULL, format TEXT NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ, output_uri TEXT, receipt JSONB, last_error TEXT, UNIQUE(tenant_id,provider,idempotency_key),
  CHECK(status IN ('queued','running','succeeded','failed','dead_letter','reconciled'))
);
CREATE TABLE IF NOT EXISTS deck_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id TEXT NOT NULL, workflow_id UUID NOT NULL REFERENCES deck_workflows(id),
  fixture_version TEXT NOT NULL, overflow_count INTEGER NOT NULL, contrast_score NUMERIC NOT NULL, accessibility_score NUMERIC NOT NULL,
  brand_score NUMERIC NOT NULL, export_valid BOOLEAN NOT NULL, passed BOOLEAN NOT NULL, details JSONB NOT NULL DEFAULT '{}', evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS deck_workflow_audit (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_id UUID, actor_id TEXT NOT NULL, action TEXT NOT NULL,
  from_stage TEXT, to_stage TEXT, payload JSONB NOT NULL DEFAULT '{}', occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION deck_workflow_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'deck audit is append-only'; END; $$;
DROP TRIGGER IF EXISTS deck_workflow_audit_no_mutation ON deck_workflow_audit;
CREATE TRIGGER deck_workflow_audit_no_mutation BEFORE UPDATE OR DELETE ON deck_workflow_audit FOR EACH ROW EXECUTE FUNCTION deck_workflow_audit_immutable();
COMMIT;
