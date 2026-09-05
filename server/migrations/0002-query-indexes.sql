CREATE INDEX IF NOT EXISTS records_references ON records USING gin(data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS audit_company_sequence ON audit_events(tenant_id,company_id,sequence DESC);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(tenant_id,company_id,sequence) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS assets_retention ON assets(tenant_id,created_at) WHERE state<>'expired';
