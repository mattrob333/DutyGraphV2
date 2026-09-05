CREATE TABLE provider_settings (
 tenant_id uuid NOT NULL REFERENCES tenants(id), provider text NOT NULL CHECK(provider IN ('openai','exa','resend')),
 encrypted_key text NOT NULL, enabled boolean NOT NULL DEFAULT true, config jsonb NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,provider)
);
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON provider_settings USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
CREATE TABLE provider_jobs (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, company_id uuid NOT NULL, kind text NOT NULL,
 state text NOT NULL DEFAULT 'reserved', input jsonb NOT NULL, result jsonb, message text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 FOREIGN KEY(tenant_id,company_id) REFERENCES companies(tenant_id,id)
);
CREATE INDEX provider_jobs_scope ON provider_jobs(tenant_id,company_id,created_at DESC);
ALTER TABLE provider_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON provider_jobs USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
CREATE TABLE auth_attempts (bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
