CREATE TABLE research_runs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  company_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  query text NOT NULL,
  domain text NOT NULL DEFAULT '',
  state text NOT NULL CHECK(state IN ('reserved','running','complete','failed','unknown')),
  results jsonb NOT NULL DEFAULT '[]',
  provider_request_id text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  FOREIGN KEY(tenant_id,company_id) REFERENCES companies(tenant_id,id)
);
CREATE INDEX research_budget ON research_runs(tenant_id,created_at);
ALTER TABLE research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY research_tenant ON research_runs USING (tenant_id=current_setting('app.tenant_id',true)::uuid) WITH CHECK (tenant_id=current_setting('app.tenant_id',true)::uuid);
